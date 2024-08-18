import {App, Notice, Plugin, PluginSettingTab, Setting, TFile} from 'obsidian';
import * as fs from "fs";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	BookXNotePath: string;
	ObsidianPath: string;
	IsIgnoreUnchanged: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	BookXNotePath: "",
	ObsidianPath: "",
	IsIgnoreUnchanged: true,
}


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	// 右上角菜单
	async onload() {
		await this.loadSettings();
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('scroll-text', 'BookXNote同步所有笔记', (_: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('开始同步BookXNote...');
			syncBookXNote(this)
		});
		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// 增加文件设置
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
					if (file instanceof TFile) {
						menu.addItem((item) => {
							item
								.setTitle('BookXNote同步此笔记')
								.setIcon('refresh-cw')
								.onClick(async () => {
									const titleName = file.name.replace(".md", "")
									new Notice(`开始同步BookXNote ${titleName}`);
									const nb = GetFilePropertyByKey(file, "book_x_note_nb")
									console.log("nb:" + nb);
									if (nb) {
										try {
											await readNotebook(this, nb, titleName)
										} catch (e) {
											new Notice(`${titleName}同步失败:` + e);
										}
									} else {
										new Notice(`${titleName}没有找到对应的属性book_x_note_nb, 请全部更新一次`);
									}
								});
						});
					}
				}
			))


		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'bookxnote-sync',
			name: '同步所有笔记',
			callback: () => {
				new Notice('开始同步BookXNote...');
				syncBookXNote(this)
			}
		});

		this.addCommand({
			id: 'bookxnote-sync-one',
			name: '同步当前笔记',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile()
				if (activeFile) {
					const titleName = activeFile.name.replace(".md", "")
					new Notice(`开始同步BookXNote ${titleName}`);
					const nb = GetFilePropertyByKey(activeFile, "book_x_note_nb")
					console.log("nb:" + nb);
					if (nb) {
						readNotebook(this, nb, titleName).then(() => {
							new Notice(`${titleName}同步成功`)
						}).catch((e) => {
							new Notice(`${titleName}同步失败:` + e);
						})
					}
				}
			}
		})
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BookXNoteSetting(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// 同步函数
async function syncBookXNote(t: MyPlugin) {
	const notebookDir = t.settings.BookXNotePath
	if (!notebookDir) {
		new Notice('请设置BookXNote路径');
		return
	}
	const notebookManifest = notebookDir + "\\manifest.json"
	// 读取json文件
	const manifest = fs.readFileSync(notebookManifest, 'utf8')
	// console.log(manifest);
	// 解析 json文件
	const manifestObj = JSON.parse(manifest)
	console.log(manifestObj);
	if (!manifestObj.notebooks) {
		new Notice('没有notebooks');
		return
	}
	for (let i = 0; i < manifestObj.notebooks?.length; i++) {
		let notebook = manifestObj.notebooks[i];
		try {
			await readNotebook(t, notebook.id, notebook.entry)
			console.log(notebook.id + ":" + notebook.entry);
		} catch (e) {
			new Notice(`读取${notebook.entry}失败:` + e);
			console.log(e);
		}
	}
}

// 读取一本书的notebook内容
async function readNotebook(t: MyPlugin, nb: string, entry: string) {
	const app = t.app
	const notebookDirBase = t.settings.BookXNotePath
	const notebookDir = notebookDirBase + `\\${entry}`
	const notebookManifest = notebookDir + "\\manifest.json"
	// 读取json文件
	const manifest = fs.readFileSync(notebookManifest, 'utf8')
	// console.log(manifest);
	// 解析 json文件
	const manifestObj = JSON.parse(manifest)
	console.log(manifestObj)
	const book_uuid = manifestObj.res[0]["uuid"]
	console.log("书的uuid:" + book_uuid);

	const notebookMarkup = notebookDir + "\\markups.json"
	const markup = fs.readFileSync(notebookMarkup, 'utf8')
	// 读取notebookMarup 文件的修改时间
	const markupStat = fs.statSync(notebookMarkup)
	console.log("markupStat:" + markupStat.mtime);
	// console.log(markup);
	const markupObj = JSON.parse(markup)
	const render = parseMarkupObj(markupObj, 1, nb, book_uuid)

	// 新建文件 并且把内容写入到文件中 如果文件存在，就更改文件
	let localDir = t.settings.ObsidianPath
	if (!localDir) {
		// 本地根目录
		localDir = app.vault.getRoot().path
	}
	// 创建文件夹
	await app.vault.adapter.mkdir(localDir)
	// 合并路径
	let filePath = `${localDir}/${entry}.md`
	let file
	const existFile = await app.vault.adapter.exists(filePath)
	// console.log("文件是否存在:" + existFile)
	let origin_front_matter = {}
	if (existFile) {
		file = app.vault.getFileByPath(filePath)
		if (file) {
			// console.log("文件存在, 进行更改");
			// 读取 origin_front_matter 到 origin_front_matter 中
			const sync_time = GetFilePropertyByKey(file, "book_x_note_sync_time")
			// 如果sync_time存在, 则和文件的修改时间作比较，如果sync_time_date 大于 markupStat.mtime, 则不进行更改
			if (sync_time && t.settings.IsIgnoreUnchanged) {
				// 把时间转换成Date对象
				const sync_time_date = new Date(sync_time)
				console.log("sync_time_date:" + sync_time_date)
				if (sync_time_date > markupStat.mtime) {
					// 如果sync_time_date 大于 markupStat.mtime, 则不进行更改
					new Notice(`${entry}  没有更新, 不进行更改`)
					return
				}
			}
			await app.fileManager.processFrontMatter(file, (frontmatter) => {
				origin_front_matter = {...frontmatter}
				// console.log("原来的属性:" + JSON.stringify(origin_front_matter))
			})
			await app.vault.modify(file, render)
		}
	} else {
		// console.log("文件不存在, 进行创建");
		file = await app.vault.create(filePath, render)
	}
	// 添加属性
	if (file) {
		await app.fileManager.processFrontMatter(file, (frontmatter) => {
			Object.assign(frontmatter, origin_front_matter)
			frontmatter.book_x_note_uuid = book_uuid
			frontmatter.book_x_note_nb = nb
			frontmatter.book_x_note_sync_time = new Date().toLocaleString()
		})
	}
	// if (file){
	// 	await app.workspace.openLinkText(file.path, "", true)
	// }
}

// 解析markup obj 内容
function parseMarkupObj(markupObj: any, headerNumber: number, nb: string, book_uuid: string) {
	let render = ""
	const title = markupObj.title
	if (title && headerNumber > 1) {
		render += `${"#".repeat(headerNumber)} ${title}\n\n`
	}
	let originaltext = markupObj.originaltext
	if (originaltext) {
		originaltext = originaltext.replaceAll("\n", "\n>")
		render += `> ${originaltext}`
		// 连接
		if (markupObj.textblocks && markupObj.textblocks.length > 0) {
			let f = markupObj.textblocks[0];
			f = f['first']
			let x = f[0]
			let y = f[1]
			const book_link = `bookxnotepro://opennote/?nb=${nb}&book=${book_uuid}&page=${markupObj.page}&x=${x}&y=${y}&id=1&uuid=${markupObj.uuid}`
			// console.log("book_link:", book_link)
			const link = `[p${markupObj.page}](${book_link})`
			// 如果render 以 "]"结尾 需要再加两个空格
			if (render.endsWith("]")) {
				render += "  "
			}
			render += `${link}`
		}
		render += "\n\n"
	}
	const content = markupObj.content
	if (content) {
		render += `${content}\n\n`
	}
	const children = markupObj.markups
	if (children) {
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			render += parseMarkupObj(child, headerNumber + 1, nb, book_uuid)
		}
	}
	return render
}


// 检查文件中是否有bookxnote属性
function isFileHasProperty(file: TFile, key: string) {
	// 获取文件的属性
	const cache = this.app.metadataCache.getFileCache(file);
	// 查看fontmatter 中有没有 bookxnote属性
	return cache?.frontmatter && cache.frontmatter[key]
}

// 获取bookxnote的值
function GetFilePropertyByKey(file: TFile, key: string): string | null {
	if (isFileHasProperty(file, key)) {
		const cache = this.app.metadataCache.getFileCache(file)
		const frontMatter = cache?.frontmatter;
		return frontMatter[key]
	} else {
		return null
	}
}


class BookXNoteSetting extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('BookXNotePath')
			.setDesc('BookXNote笔记路径')
			.addText(text => text
				.setPlaceholder('输入BookXNote笔记路径')
				.setValue(this.plugin.settings.BookXNotePath)
				.onChange(async (value) => {
					this.plugin.settings.BookXNotePath = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('ObsidianPath')
			.setDesc('笔记保存到Obsidian的路径')
			.addText(text => text
				.setPlaceholder('输入笔记保存到Obsidian的相对路径')
				.setValue(this.plugin.settings.ObsidianPath)
				.onChange(async (value) => {
					this.plugin.settings.ObsidianPath = value;
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('IsIgnoreUnchanged')
			.setDesc('是否忽略未修改的文件,通过比对文件的修改时间来判断文件是否修改')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.IsIgnoreUnchanged)
				.onChange(async (value) => {
					this.plugin.settings.IsIgnoreUnchanged = value;
				})
			)
	}
}
