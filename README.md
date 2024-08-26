# BookXNote
BookXNote 是一款优秀的读书笔记软件，可以在读书的同时快速做读书笔记，支持PDF、epub、mobi、txt、docx等格式的电子书。

# 关于本插件
本插件是BookXNote的插件，可以把保存在BookXNote中的笔记一键同步到Obsidian中
插件原理很简单，BookXNote把笔记都存在一个Notebooks文件夹下面，并且作者使用json格式存放，存储的结构清晰（给BookXNote作者大大的赞）。
只要读取笔记文件，然后重新组织下放到我们的OB笔记中就可以了。

# 如何使用
### 1. 安装插件
当前BookXNote的插件正在提交到插件平台上（2024年08月25日 还没有通过），所以想要使用插件的朋友需要自行下载安装，具体安装请搜索*Obsidian插件手动安装方法*，就不再赘述。
项目地址：https://github.com/CodeListening/obsidian-bookxnote/tree/master
### 2. 启动插件
### 3. 设置插件
找到booxnote的笔记本路径，找到笔记文件夹，以notebooks结尾，例如
`C:\Users\user\documents\bookxnote\notebooks` 替换成自己的路径
![设置](setting.png)
1. BookXNotePath 是BookXNote笔记存放的位置，定位到notebooks文件夹。例如`C:\Users\bookxnote\notebooks`,注意最终是notebooks结尾，没有 **\\**。
2. ObsidianPath 是Obsidian笔记存放路径，注意使用 **/** 区分文件夹
### 4. 同步笔记
#### 导入所有的笔记
![同步所有笔记](sync-notebook.png)

#### 单条笔记导入
![插图-bookxnote单条笔记更新.png](%B2%E5%CD%BC-bookxnote%B5%A5%CC%F5%B1%CA%BC%C7%B8%FC%D0%C2.png)
