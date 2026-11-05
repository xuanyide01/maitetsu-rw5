# 第三方与资源说明

## 原游戏

本地输入来自用户提供的游戏目录《爱上火车 -Last Run!!-》。文本、图像、Logo、角色设计及音乐不受本仓库 MIT 许可覆盖。原作开发 Lose、发行 HIKARI FIELD，见 [原作商店页](https://store.steampowered.com/app/1434480/)。

用户指定的钢琴曲来自先前本机资源转换任务。设备版使用其完整内容的 PCM 衍生文件。此说明不授予对原游戏素材或音乐的额外使用权。

## 代码和开发工具

- 阅读界面、自动阅读、存档代码以用户既有 Starry / Summer 项目的 MIT 实现为基础；版权声明保留于 `LICENSE`。本项目适配和工具由 Codex 完成。
- [FreeMote](https://github.com/UlyssesWu/FreeMote)：PSB 反编译、重建；工具遵循其上游许可。
- [FreeMote.NET](https://github.com/UlyssesWu/FreeMote.NET)：桌面端角色模型渲染接口。渲染脚本通过本机安装的库导出静态图片。未将其 DLL 或 E-mote 运行库加入手表安装包。
- [GARbro-Mod](https://github.com/nanami5270/GARbro-Mod)：用于 XP3 目录和格式研究；原项目采用 MIT，具体以各上游文件说明为准。
- [xp3-brute](https://github.com/xmoezzz/xp3-brute)：MIT，用于静态资源过滤器和 PE 规范化相关资料参考。本交付包不包含下载的上游源码副本。
- 资源研究使用 pefile、Capstone、Unicorn；图片转换使用 Pillow、NumPy、libimagequant / imagequant、Zopfli；音乐转换使用本机 FFmpeg。均为外部开发依赖，其各自版权及许可证以安装版本为准。
- 设备程序通过外部 aiot-toolkit 1.1.0 构建。模拟器来自外部 Vela SDK；源码交付不捆绑 SDK、模拟器镜像、编译器依赖或签名私钥。

本地研究目录中存在的上游源码、运行库、原始游戏副本与分析产物，不属于自编代码 MIT 授权范围，也不包含在精简源码交付包中。

本次还使用 [tjs2-decompiler](https://github.com/crate-1556/tjs2-decompiler) 对本机原作显示脚本做静态分析，以核对视口、镜头投影和显示状态；该工具和原作脚本未随交付包分发。新增 PNG 颜色表、扫描行滤波和透明空隙拆分脚本为本项目实现。
