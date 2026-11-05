# 爱上火车 · 二六线 · REDMI Watch 5

**0.1.3 · 9,954,241 字节（9.95 MB）**。面向 REDMI Watch 5 的 432 × 514 屏幕。Codex 完成资源转换、移植和验证。应用名为「爱上火车」，包名为 `com.codex.maitetsu.rw5`。

保留原作二六线的「正和四十一年·小仓」「御一夜旅行」「小仓风暴」「尾声」四章，共 1,537 段简体中文。标题使用原作中文标志、二六敬礼立绘和赤井的宿舍背景。应用封面从二六读书的 Q 版原作 CG 重新取景，使用与《星之终途》《ATRI》相同的圆形透明蒙版方法。手表阅读画面使用原作镜头、站位和表情的静态快照，CG 鉴赏保留 6 组 35 张。

![标题](docs/images/title.png)
![阅读](docs/images/reading.png)
![CG 鉴赏](docs/images/gallery.png)

## 阅读和安装

[下载 v0.1.3 安装包](https://github.com/xuanyide01/maitetsu-rw5/releases/tag/v0.1.3)。

- 轻点剧情画面或正文推进。逐字显示时第一次点击补全当前句；拖动正文可滚动。菜单提供下一章、三档自动播放速度、字号和 30 个存档栏位。
- 剧情切换时同步提交正文和对应图层，无需等所有图片回调才开始显示下一句。阅读到分块末尾前预读下一小块文本。若确需等待文本，先保留当前段，等待超过约 350 毫秒才显示提示。
- 从标题进入阅读设置、读档或 CG 鉴赏时，继续循环播放《繋いでいく未来》钢琴版。进入剧情时释放本应用的播放器。标题曲沿用 0.1.1 的完整低采样率单声道 WAV。
- `.bin` 和 `.rpk` 字节相同，使用支持相应格式的工具安装。通过表盘自定义工具发送后，等手表完成安装并刷新应用列表，再打开游戏。模拟器覆盖安装后成功读取原有的第 30 栏存档。 [表盘自定义工具](https://www.bandbbs.cn/)
- 若首次看不到应用图标，先等安装结束，确认有可用空间，再正常重启手表后重试。应用卡住时退出并从已存栏位重开，记下卡住的台词和固件版本。卸载可能清除存档。

**2026-11-05，用户确认本版在红米手表 5 实机测试通过。** [验证报告](TEST_REPORT.md)

## 构建

源码使用已转换的设备资源。需要 Node.js、Python 3、Pillow 和 aiot-toolkit 1.1.0。

```powershell
npm install --prefix tools/compat-toolkit --ignore-scripts
npm test
npm run build
python tools/audit-package.py
```

也可将 `WATCH_COMPAT_TOOLKIT` 设置为本地 aiot-toolkit 目录。输出文件为 `dist/com.codex.maitetsu.rw5.debug.0.1.3.rpk`。构建使用已转换的资源。可把提取的原作 `ニイロクアフター02_SD04_02.jpg` 传给 `tools/build-round-icon.py` 重新生成封面。测试数据与原生运行记录在 `reports/`。

## 致谢和授权

- 原作由 Lose 开发、HIKARI FIELD 发行。原作文本、图像、标志和音乐由各权利人持有。 [Steam 原作页](https://store.steampowered.com/app/1434480/)
- 压缩和阅读器参考了《星之终途》《ATRI》《星空列车与白的旅行》《夏日口袋》《CLANNAD》及《命运石之门》系列的手表移植。
- 感谢 @liuyuze61 的早期手表移植。 [ATRI 1.5.1](https://api.bandbbs.cn/wftools/bandbbs.html?code=A&state=1820673) · [星空列车与白的旅行 v1.0.0](https://api.bandbbs.cn/wftools/bandbbs.html?code=A&state=1841662)
- 自编代码采用 [MIT](LICENSE)。第三方工具和原作素材各按其自身授权处理，见 [第三方声明](THIRD_PARTY_NOTICES.md)。
