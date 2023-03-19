fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = '#108ce6';
fabric.Object.prototype.borderColor = '#108ce6';
fabric.Object.prototype.cornerSize = 10;
fabric.Object.prototype.lockRotation = true;

let count = 0;
let executed_openpose_editor = false;

let lockMode = false;
const undo_history = [];
const redo_history = [];

coco_body_keypoints = [
    "nose",
    "neck",
    "right_shoulder",
    "right_elbow",
    "right_wrist",
    "left_shoulder",
    "left_elbow",
    "left_wrist",
    "right_hip",
    "right_knee",
    "right_ankle",
    "left_hip",
    "left_knee",
    "left_ankle",
    "right_eye",
    "left_eye",
    "right_ear",
    "left_ear",
]
//手部连接点
let connect_hand_keypoints =  [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20]]
let connect_keypoints = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [1, 8], [8, 9], [9, 10], [1, 11], [11, 12], [12, 13], [0, 14], [14, 16], [0, 15], [15, 17]]

let connect_color = [[0, 0, 255], [255, 0, 0], [255, 170, 0], [255, 255, 0], [255, 85, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0],
[0, 255, 85], [0, 255, 170], [0, 255, 255], [0, 170, 255], [0, 85, 255], [85, 0, 255],
[170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]]
let connect_hand_color = [[255. ,  0. ,  0.]    ,
                    [255. ,  76.5 ,  0. ],
                    [255., 153.  , 0.],
                    [255. , 229.5 ,  0. ],
                    [204. ,255.  , 0.],
                    [127.5 ,255. ,   0. ],
                    [ 51., 255.  , 0.],
                    [  0. , 255. ,  25.5],
                    [  0. ,255. ,102.],
                    [  0. , 255. , 178.5],
                    [  0. ,255., 255.],
                    [  0. , 178.5, 255. ],
                    [  0. ,102. ,255.],
                    [  0. ,  25.5 ,255. ],
                    [ 51.  , 0., 255.],
                    [127.5 ,  0.  ,255. ],
                    [204.  , 0. ,255.],
                    [255.  ,  0. , 229.5],
                    [255.  , 0. ,153.],
                    [255.  ,  0. ,  76.5] ]


let openpose_obj = {
    // width, height
    resolution: [512, 512],
    // fps...?
    fps: 1,
    // frames
    frames: [
        {
            frame_current: 1,
            // armatures
            armatures: {
            },
        }
    ]
}

//左手和右手
const default_keypoints_lefthand = [[334, 248], [338, 235], [346, 220], [354, 209], [361, 200], [367, 230], [380, 222], [390, 217], [398, 213], [369, 240], [387, 233], [397, 228], [406, 226], [368, 248], [385, 243], [395, 242], [405, 240], [366, 255], [377, 254], [384, 254], [391, 254]]
const default_keypoints_righthand = [[161, 256], [153, 242], [140, 229], [130, 218], [121, 208], [124, 241], [109, 236], [99, 233], [89, 229], [122, 251], [105, 247], [94, 245], [85, 243], [124, 261], [108, 259], [97, 258], [87, 258], [128, 270], [117, 270], [109, 270], [102, 269]]

//身体
const default_keypoints = [[241,77],[241,120],[191,118],[177,183],[163,252],[298,118],[317,182],[332,245],[225,241],[213,359],[215,454],[270,240],[282,360],[286,456],[232,59],[253,60],[225,70],[260,72]]

function gradioApp() {
    const elems = document.getElementsByTagName('gradio-app')
    const gradioShadowRoot = elems.length == 0 ? null : elems[0].shadowRoot
    return !!gradioShadowRoot ? gradioShadowRoot : document;
}

function calcResolution(resolution){
    const width = resolution[0]
    const height = resolution[1]
    const viewportWidth = window.innerWidth / 2.25;
    const viewportHeight = window.innerHeight * 0.75;
    const ratio = Math.min(viewportWidth / width, viewportHeight / height);
    return {width: width * ratio, height: height * ratio}
}

function resizeCanvas(width, height){
    const elem = openpose_editor_elem;
    const canvas = openpose_editor_canvas;

    let resolution = calcResolution([width, height])

    canvas.setWidth(width);
    canvas.setHeight(height);
    elem.style.width = resolution["width"] + "px"
    elem.style.height = resolution["height"] + "px"
    elem.nextElementSibling.style.width = resolution["width"] + "px"
    elem.nextElementSibling.style.height = resolution["height"] + "px"
    elem.parentElement.style.width = resolution["width"] + "px"
    elem.parentElement.style.height = resolution["height"] + "px"
}

function undo() {
    const canvas = openpose_editor_canvas;
    if (undo_history.length > 0) {
        lockMode = true;
        if (undo_history.length > 1) redo_history.push(undo_history.pop());
        const content = undo_history[undo_history.length - 1];
        canvas.loadFromJSON(content, function () {
            canvas.renderAll();
            lockMode = false;
        });
    }
}

function redo() {
    const canvas = openpose_editor_canvas;
    if (redo_history.length > 0) {
        lockMode = true;
        const content = redo_history.pop();
        undo_history.push(content);
        canvas.loadFromJSON(content, function () {
        canvas.renderAll();
            lockMode = false;
        });
    }
}
//画图需要三个：keypoints节点位置，connect_keypoints节点连接情况，connect_color连接线的颜色
//loadjson调用了这个函数 setPose(json["keypoints"])
function setPose(keypoints,connect_keypoints,connect_color){
    const canvas = openpose_editor_canvas;

    canvas.backgroundColor = "#000"
    if(keypoints.length %18 === 0 && keypoints.length !== 0){
        const res = [];
        for (let i = 0; i < keypoints.length; i += 18) {
            const chunk = keypoints.slice(i, i + 18);
            res.push(chunk);
        }

        for (item of res){
            addPose(item,connect_keypoints,connect_color)
            openpose_editor_canvas.discardActiveObject();
        }
    }
    if(keypoints.length %21 === 0 && keypoints.length !== 0){
        const res = [];
        for (let i = 0; i < keypoints.length; i += 21) {
            const chunk = keypoints.slice(i, i + 21);
            res.push(chunk);
        }

        for (item of res){
            addPose(item,connect_keypoints,connect_color)
            openpose_editor_canvas.discardActiveObject();
        }
    }



}
function addPose_body(keypoints = default_keypoints,a=connect_keypoints,b=connect_color){
    addPose(keypoints,a,b);
}
function addPose_left(keypoints = default_keypoints_lefthand,connect_keypoints=connect_hand_keypoints,connect_color=connect_hand_color){
    addPose(keypoints,connect_keypoints,connect_color);
}
function addPose_right(keypoints = default_keypoints_righthand,connect_keypoints=connect_hand_keypoints,connect_color=connect_hand_color){
    addPose(keypoints,connect_keypoints,connect_color);
}

function addPose(keypoints=undefined,connect_keypoints=undefined,connect_color=undefined){

    const canvas = openpose_editor_canvas;

    const group = new fabric.Group()

    function makeCircle(color, left, top, line1, line2, line3, line4, line5) {
        var c = new fabric.Circle({
            left: left-2,
            top: top-2,
            strokeWidth: 1,
            radius: 2,
            fill: color,
            stroke: color
        });
        c.hasControls = c.hasBorders = false;

        c.line1 = line1;
        c.line2 = line2;
        c.line3 = line3;
        c.line4 = line4;
        c.line5 = line5;

        return c;
    }

    function makeLine(coords, color) {
        return new fabric.Line(coords, {
            fill: color,
            stroke: color,
            strokeWidth: 2,
            selectable: false,
            evented: false,
        });
    }

    const lines = []
    const circles = []

    for (i = 0; i < connect_keypoints.length; i++){
        // 接続されるidxを指定　[0, 1]なら0と1つなぐ
        const item = connect_keypoints[i]
        const line = makeLine(keypoints[item[0]].concat(keypoints[item[1]]), `rgba(${connect_color[i].join(", ")}, 0.7)`)
        lines.push(line)
        canvas.add(line)
    }
    if (keypoints.length === 21){
    for (i = 0; i < keypoints.length; i++){
        list = []
        connect_keypoints.filter((item, idx) => {
            if(item.includes(i)){
                list.push(lines[idx])
                return idx
            }
        })
        //keypoint就是位置坐标有21个点
        circle = makeCircle("blue", keypoints[i][0], keypoints[i][1], ...list)
        circle["id"] = i

        circle["name"]="hands"

        circles.push(circle)
        // canvas.add(circle)
        group.addWithUpdate(circle);
    }
    }
    if (keypoints.length === 18){
    for (i = 0; i < keypoints.length; i++){
        list = []
        connect_keypoints.filter((item, idx) => {
            if(item.includes(i)){
                list.push(lines[idx])
                return idx
            }
        })
        //keypoint就是位置坐标有18个点
        circle = makeCircle("blue", keypoints[i][0], keypoints[i][1], ...list)
        circle["id"] = i

        circle["name"]="body"

        circles.push(circle)
        // canvas.add(circle)
        group.addWithUpdate(circle);
    }
    }




    canvas.discardActiveObject();
    canvas.setActiveObject(group);
    canvas.add(group);
    canvas.selection = true;
    group.toActiveSelection();
    group.hasControls = true;
    group.hasBorders = true;
    group.lockScalingFlip = true; // 锁定缩放和翻转
    group.lockUniScaling = true; // 锁定等比缩放
    canvas.requestRenderAll();

}

function initCanvas(elem){
    const canvas = window.openpose_editor_canvas = new fabric.Canvas(elem, {
        backgroundColor: '#000',
        // selection: false,
        preserveObjectStacking: true
    });

    window.openpose_editor_elem = elem

    canvas.on('object:moving', function(e) {
        if ("_objects" in e.target) {
            const rtop = e.target.top
            const rleft = e.target.left
            for (const item of e.target._objects){
                let p = item;
                const top = rtop + p.top * e.target.scaleY + e.target.height * e.target.scaleY / 2;
                const left = rleft + p.left * e.target.scaleX + e.target.width * e.target.scaleX / 2;
                if (p["id"] === 0) {
                    p.line1 && p.line1.set({ 'x1': left, 'y1': top });
                }else{
                    p.line1 && p.line1.set({ 'x2': left, 'y2': top });
                }
                p.line2 && p.line2.set({ 'x1': left, 'y1': top });
                p.line3 && p.line3.set({ 'x1': left, 'y1': top });
                p.line4 && p.line4.set({ 'x1': left, 'y1': top });
                p.line5 && p.line5.set({ 'x1': left, 'y1': top });
            }
        }else{
            var p = e.target;
            if (p["id"] === 0) {
                p.line1 && p.line1.set({ 'x1': p.left, 'y1': p.top });
            }else{
                p.line1 && p.line1.set({ 'x2': p.left, 'y2': p.top });
            }
            p.line2 && p.line2.set({ 'x1': p.left, 'y1': p.top });
            p.line3 && p.line3.set({ 'x1': p.left, 'y1': p.top });
            p.line4 && p.line4.set({ 'x1': p.left, 'y1': p.top });
            p.line5 && p.line5.set({ 'x1': p.left, 'y1': p.top });
        }
        canvas.renderAll();
    });

    canvas.on('object:scaling', function(e) {
        if ("_objects" in e.target) {
            const rtop = e.target.top
            const rleft = e.target.left
            for (const item of e.target._objects){
                let p = item;
                const top = rtop + p.top * e.target.scaleY + e.target.height * e.target.scaleY / 2;
                const left = rleft + p.left * e.target.scaleX + e.target.width * e.target.scaleX / 2;
                if (p["id"] === 0) {
                    p.line1 && p.line1.set({ 'x1': left, 'y1': top });
                }else{
                    p.line1 && p.line1.set({ 'x2': left, 'y2': top });
                }
                p.line2 && p.line2.set({ 'x1': left, 'y1': top });
                p.line3 && p.line3.set({ 'x1': left, 'y1': top });
                p.line4 && p.line4.set({ 'x1': left, 'y1': top });
                p.line5 && p.line5.set({ 'x1': left, 'y1': top });
            }
        }
        canvas.renderAll();
    });

    canvas.on('object:rotating', function(e) {
        if ("_objects" in e.target) {
            const rtop = e.target.top
            const rleft = e.target.left
            for (const item of e.target._objects){
                let p = item;
                const top = rtop + p.top // + e.target.height / 2;
                const left = rleft + p.left // + e.target.width / 2;
                if (p["id"] === 0) {
                    p.line1 && p.line1.set({ 'x1': left, 'y1': top });
                }else{
                    p.line1 && p.line1.set({ 'x2': left, 'y2': top });
                }
                p.line2 && p.line2.set({ 'x1': left, 'y1': top });
                p.line3 && p.line3.set({ 'x1': left, 'y1': top });
                p.line4 && p.line4.set({ 'x1': left, 'y1': top });
                p.line5 && p.line5.set({ 'x1': left, 'y1': top });
            }
        }
        canvas.renderAll();
    });


    canvas.on("object:added", function () {
        if (lockMode) return;
        undo_history.push(JSON.stringify(canvas));
        redo_history.length = 0;
    });

    canvas.on("object:modified", function () {
        if (lockMode) return;
        undo_history.push(JSON.stringify(canvas));
        redo_history.length = 0;
    });

    resizeCanvas(...openpose_obj.resolution)
    setPose(default_keypoints,connect_keypoints,connect_color)
    setPose(default_keypoints_lefthand,connect_hand_keypoints,connect_hand_color)
    setPose(default_keypoints_righthand,connect_hand_keypoints,connect_hand_color)
    undo_history.push(JSON.stringify(canvas));

//    const json_observer = new MutationObserver((m) => {
//        if(gradioApp().querySelector('#tab_openpose_editor').style.display!=='block') return;
//        try {
//            const raw = gradioApp().querySelector("#hide_json").querySelector("textarea").value.replaceAll("'", '"')
//            const json = JSON.parse(raw)
//
//            let candidate = json["candidate"]
//            let subset = json["subset"]
//            const li = []
//            subset = subset.splice(0, 18)
//            for (i=0; subset.length > i; i++){
//                if (Number.isInteger(subset[i]) && subset[i] >= 0){
//                    li.push(candidate[subset[i]])
//                }else{
//                    const ra_width = Math.floor(Math.random() * canvas.width)
//                    const ra_height = Math.floor(Math.random() * canvas.height)
//                    li.push([ra_width, ra_height])
//                }
//            }
//
//            setPose(li);
//
//            const fileReader = new FileReader();
//            fileReader.onload = function() {
//                const dataUri = this.result;
//                canvas.setBackgroundImage(dataUri, canvas.renderAll.bind(canvas), {
//                    opacity: 0.5
//                });
//                const img = new Image();
//                img.onload = function() {
//                    resizeCanvas(this.width, this.height)
//                }
//                img.src = dataUri;
//            }
//            fileReader.readAsDataURL(gradioApp().querySelector("#openpose_editor_input").querySelector("input").files[0]);
//        } catch(e){console.log(e)}
//    })
//    json_observer.observe(gradioApp().querySelector("#hide_json"), { "attributes": true })

    // document.addEventListener('keydown', function(e) {
    //     if (e.key !== undefined) {
    //         if((e.key == "z" && (e.metaKey || e.ctrlKey || e.altKey))) undo()
    //         if((e.key == "y" && (e.metaKey || e.ctrlKey || e.altKey))) redo()
    //     }
    // })
}

function resetCanvas(){
    const canvas = openpose_editor_canvas;
    canvas.clear()
    canvas.backgroundColor = "#000"
}

function savePNG(){
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 0
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0
    openpose_editor_canvas.discardActiveObject();
    openpose_editor_canvas.renderAll()
    openpose_editor_elem.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "pose.png";
        a.click();
        URL.revokeObjectURL(a.href);
    });
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 1
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0.5
    openpose_editor_canvas.renderAll()
    return openpose_editor_canvas
}

function saveJSON() {
    const canvas = openpose_editor_canvas;
    const bodyKeypoints = openpose_editor_canvas.getObjects().filter((item) => {
        return item.name === "body";
    }).map((item) => {
        return [Math.round(item.left), Math.round(item.top)];
    });
    const handKeypoints = openpose_editor_canvas.getObjects().filter((item) => {
        return item.name === "hands";
    }).map((item) => {
        return [Math.round(item.left), Math.round(item.top)];
    });
    const json = JSON.stringify({
        "width": canvas.width,
        "height": canvas.height,
        "keypoints": bodyKeypoints,
        "hands_keypoints": handKeypoints
    }, null, 4);
    const blob = new Blob([json], {
        type: 'text/plain'
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pose.json";
    a.click();
    URL.revokeObjectURL(a.href);
    return json;
}

async function loadJSON(file){
    const response = await fetch(file.data)
    const json = await response.json();
    if (json["width"] && json["height"]) {
        resizeCanvas(json["width"], json["height"])
    }else{
        throw new Error('width, height is invalid');
    }

    if (json["hands_keypoints"].length % 21 === 0 && json["hands_keypoints"].length !== 0) {
        setPose(json["hands_keypoints"],connect_hand_keypoints,connect_hand_color)
    }
    //画身体
    if (json["keypoints"].length % 18 === 0 && json["keypoints"].length !== 0) {
        setPose(json["keypoints"],connect_keypoints,connect_color)
    }else{
        throw new Error('keypoints is invalid')
    }
    return [json["width"], json["height"]]
}

function addBackground(){
    const input = document.createElement("input");
    input.type = "file"
    input.accept = "image/*"
    input.addEventListener("change", function(e){
        const canvas = openpose_editor_canvas
        const file = e.target.files[0];
		var fileReader = new FileReader();
		fileReader.onload = function() {
			var dataUri = this.result;
            canvas.setBackgroundImage(dataUri, canvas.renderAll.bind(canvas), {
                opacity: 0.5
            });
            const img = new Image();
            img.onload = function() {
                resizeCanvas(this.width, this.height)
            }
            img.src = dataUri;
		}
		fileReader.readAsDataURL(file);
    })
    input.click()
    return
}

function detectImage(){
    gradioApp().querySelector("#openpose_editor_input").querySelector("input").click()
    return
}

function sendImage(type){
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 0
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0
    openpose_editor_canvas.discardActiveObject();
    openpose_editor_canvas.renderAll()
    openpose_editor_elem.toBlob((blob) => {
        const file = new File(([blob]), "pose.png")
        const dt = new DataTransfer();
        dt.items.add(file);
        const list = dt.files
        const selector = type === "txt2img" ? "#txt2img_script_container" : "#img2img_script_container"
        if (type === "txt2img"){
            switch_to_txt2img()
        }else if(type === "img2img"){
            switch_to_img2img()
        }
        gradioApp().querySelector(selector).querySelectorAll("span.transition").forEach((elem) => {
            if (elem.previousElementSibling.textContent === "ControlNet"){
                elem.className.includes("rotate-90") && elem.parentElement.click();
                const input = elem.parentElement.parentElement.querySelector("input[type='file']");
                const button = elem.parentElement.parentElement.querySelector("button[aria-label='Clear']")
                button && button.click();
                input.value = "";
                input.files = list;
                const event = new Event('change', { 'bubbles': true, "composed": true });
                input.dispatchEvent(event);
            }
        })
    });
    openpose_editor_canvas.getObjects("image").forEach((img) => {
        img.set({
            opacity: 1
        });
    })
    if (openpose_editor_canvas.backgroundImage) openpose_editor_canvas.backgroundImage.opacity = 0.5
    openpose_editor_canvas.renderAll()
}

window.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((m) => {
        if(!executed_openpose_editor && gradioApp().querySelector('#openpose_editor_canvas')){
            executed_openpose_editor = true;
            initCanvas(gradioApp().querySelector('#openpose_editor_canvas'))
            // gradioApp().querySelectorAll("#tabs > div > button").forEach((elem) => {
            //     if (elem.innerText === "OpenPose Editor") elem.click()
            // })
            observer.disconnect();
        }
    })
    observer.observe(gradioApp(), { childList: true, subtree: true })
})
