# openpose-hand-editor
为stable-diffusion-webui开发的手部openpose插件
![image](https://github.com/zackhxn/openpose-hand-editor/blob/main/images/(G1L%240)TA%7BI79GHJ%5BL%7BGF5N.png)
## 3.19更新
-  「Load from JSON」：从JSON文件中添加身体与手部骨骼
-  「Save JSON」：保存身体与手部骨骼为json
-  json文件的键值对形式为：
```
"width": canvas.width,
"height": canvas.height,
"keypoints": bodyKeypoints([18,2]*N的list),
"hands_keypoints": handKeypoints([21,2]*N的list)
```
## 功能
-  「Add body」：添加一个新骨骼
-  「Add left hand」：添加左手
-  「Add right hand」：添加右手
-  「Add Background image」: 添加背景图片

-  「Save PNG」: 保存为PNG格式图片
-  「Send to text2img」:将骨骼姿势发送到 text2img
-  「Save to img2img」：将骨骼姿势发送到 img2img
## 安装方法

1. 打开扩展（Extension）标签。
2. 点击从网址安装（Install from URL）
3. 在扩展的 git 仓库网址（URL for extension's git repository）处输入 https://github.com/zackhxn/openpose-hand-editor
4. 点击安装（Install）
5. 重启 WebUI
