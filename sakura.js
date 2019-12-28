//读取文件
//复制文件夹
//修改包名
//修改provider
//替换图片
//打包生成apk
const path = require("path");
const os = require('os');
const fs = require("fs");
const readline = require("readline");
const parseString = require('xml2js').parseString;
const child_process = require('child_process')
//项目名称
let curPinYinName, originPinYinName, originAppName, curAppName, srcDir, url, tarDir, sdkPath, isPacker, isReplaceImg;

//替换字符串
let originXMLStr, endXMLStr, originGradleStr, endGradleStr, originUrlStr, endUrlStr, originAppStr, endAppStr, originAppNameStr, endAppNameStr, originSDKPath, endSDKPath;


//为了自动生成v1v2签名包   需要手动将 签名代码复制到build.gradle中 然后再执行打包命令
let signingStr = `
    signingConfigs {
        release {
            storeFile file("E:\\\\APK\\\\sign.jks")
            storePassword "123456"
            keyAlias "qicheng"
            keyPassword "123456"
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
`;

let topLine = "compileSdkVersion";

// 处理指定原项目中没有添加打包配置   自动添加打包配置 
let signingStr2 = `            signingConfig signingConfigs.release`
let topLine2 = "proguardFiles";

//
//替换图片的地址
let basePicPath;

let modifyFileList = new Array();
let modifyPicList = new Array();
let tarPathPicList; //array


//android 打包开始
let AndroidPacker = function () {
    console.log("开始签名打包-->>");
    //写个.bat文件
    // fs.writeFile(path, data, (err) => {
    //     if (err) {
    //         throw err;
    //     }
    //     console.log('.bat创建成功,开始执行打包');
    //     console.log('path111-->>', path);
    //     // cmd.run(path);

    //     exec(path, function (err, stdout, stderr) {
    //         if (err) {
    //             console.log('get weather api error:' + stderr.toString());
    //         } else {
    //             console.log('path-->>', path);
    //             let data = JSON.parse(stdout);
    //             console.log(data);
    //         }
    //     });
    // })

    //复制的项目根目录
    let dir = tarDir;
    //先清理项目
    let cmdClean = "gradlew clean"
    let cmdBuild = "gradlew assembleRelease"

    child_process.exec(cmdClean, { cwd: dir, encoding: "utf-8" }, function (error, stdout, stderr) {
        if (error !== null) {
            console.log("exec error" + error)
        } else console.log("成功")
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
    })
    child_process.exec(cmdBuild, { cwd: dir, encoding: "utf-8" }, function (error, stdout, stderr) {
        if (error !== null) {
            console.log("exec error" + error)
        } else console.log("成功")
        console.log('stdout: ' + stdout);
        console.log('stderr: ' + stderr);
    })
}

//修改包名
let modifyPacker = function () {
    console.log("modifyFileList-->>", modifyFileList);
    for (let i = 0; i < modifyFileList.length; i++) {
        let srcPath = modifyFileList[i];
        let fileName = path.basename(srcPath);
        if (fileName === "AndroidManifest.xml") {
            //修改FileProvider  android:authorities
            modifyXML(srcPath);
        } else if (fileName === "build.gradle") {
            modifyGradle(srcPath);
        } else if (fileName === "Constants.java") {
            modifyUrl(srcPath);
        } else if (fileName === "MyApplication.java") {
            modifyApplication(srcPath);
        } else if (fileName === "strings.xml") {
            modifyString(srcPath);
        } else if (fileName === "local.properties") {
            modifySDKPath(srcPath);
        }
    }
}

//修改图片
let modifyPicFun = function () {
    console.log("modifyPicList-->>", modifyPicList);
    for (let i = 0; i < modifyPicList.length; i++) {
        let tarPath = modifyPicList[i];
        let fileName = path.basename(tarPath);

        for (let j = 0; j < tarPathPicList.length; j++) {
            let picName = tarPathPicList[j];
            if (fileName === picName) {
                // 拼接path
                let srcPath = path.resolve(basePicPath, picName);
                modifyPic(srcPath, tarPath);

                //不管异步了 
                if (i === tarPathPicList.length - 1) {
                    //进行打包操作
                    if (isPacker == "true") {
                        setTimeout(() => {
                            AndroidPacker();
                        }, 10000);
                    }
                }
            }
        }
    }
}

let modifyPic = function (srcPath, tarPath) {
    let rs = fs.createReadStream(srcPath);
    rs.on('error', function (err) {
        if (err) { console.log('read error', srcPath); }
    })

    let ws = fs.createWriteStream(tarPath, { flags: 'w' });
    ws.on('error', function (err) {
        if (err) { console.log('write error', tarPath); }
    })
    ws.on('close', function (ex) {
        console.log(srcPath + "写入图片完成");
    })
    rs.pipe(ws);
}

let modifyXML = function (path) {
    fs.readFile(path, 'utf8', function (err, data) {
        if (err) {
            console.log(err);
            throw err;
        }
        if (data.indexOf(originXMLStr) !== -1) {
            data = data.replace(originXMLStr, endXMLStr);
        } else {
            console.error('未找到修改的地方-->>', originXMLStr);
        }
        fs.writeFile(path, data, 'utf8', (err) => {
            if (err) {
                throw err;
            }
            console.log('write success--->>', path);
        });
    })
}

let modifyGradle = function (path) {
    let fRead = fs.createReadStream(path);
    let objReadline = readline.createInterface({
        input: fRead,
        terminal: true
    });
    let arr = new Array();
    let flag = 0;
    objReadline.on('line', function (line) {
        if (flag === 1) {
            flag = 0;
            line = signingStr + os.EOL + line;
        }
        if (flag === 2) {
            flag = 0;
            line = signingStr2 + os.EOL + line;
        }
        //找到写入位置
        //找到目标位置的上一行,设置标记,等下一次循环,就插入,并且设置一个空行
        if (line.indexOf(topLine) !== -1) { flag = 1; }
        if (line.indexOf(topLine2) !== -1) { flag = 2; }

        if (line.indexOf(originGradleStr) !== -1) {
            line = line.replace(originGradleStr, endGradleStr);
        }
        if (line.indexOf(originAppName) !== -1) {
            line = line.replace(originAppName, curAppName);
        }
        arr.push(line);
    });

    objReadline.on('close', function () {
        let fWrite = fs.createWriteStream(path);
        for (let i = 0; i < arr.length; i++) {
            let line = arr[i];
            fWrite.write(line + os.EOL);
            if (i === arr.length - 1) {
                console.log('write success--->>', path);
            }
        }
    });
}

let modifyUrl = function (path) {
    let fRead = fs.createReadStream(path);
    let objReadline = readline.createInterface({
        input: fRead,
        terminal: true
    });
    let arr = new Array();
    objReadline.on('line', function (line) {
        if (line.indexOf(originUrlStr) !== -1 && line.substring(0, 5).indexOf("//") === -1) {
            line = endUrlStr;
        }
        arr.push(line);
    });

    objReadline.on('close', function () {
        let fWrite = fs.createWriteStream(path);
        for (let i = 0; i < arr.length; i++) {
            let line = arr[i];
            fWrite.write(line + os.EOL);
            if (i === arr.length - 1) {
                console.log('write success--->>', path);
            }
        }
    });
}

let modifyApplication = function (path) {
    let fRead = fs.createReadStream(path);
    let objReadline = readline.createInterface({
        input: fRead,
        terminal: true
    });
    let arr = new Array();
    objReadline.on('line', function (line) {
        if (line.indexOf(originAppStr) !== -1 && line.indexOf("import") === -1 && line.indexOf("package")) {
            line = endAppStr;
        }
        arr.push(line);
    });

    objReadline.on('close', function () {
        let fWrite = fs.createWriteStream(path);
        for (let i = 0; i < arr.length; i++) {
            let line = arr[i];
            fWrite.write(line + os.EOL);
            if (i === arr.length - 1) {
                console.log('write success--->>', path);
            }
        }
    });
}

let modifyString = function (path) {
    let fRead = fs.createReadStream(path);
    let objReadline = readline.createInterface({
        input: fRead,
        terminal: true
    });
    let arr = new Array();
    objReadline.on('line', function (line) {
        if (line.indexOf(originAppNameStr) !== -1) {
            line = endAppNameStr;
        }
        arr.push(line);
    });

    objReadline.on('close', function () {
        let fWrite = fs.createWriteStream(path);
        for (let i = 0; i < arr.length; i++) {
            let line = arr[i];
            fWrite.write(line + os.EOL);
            if (i === arr.length - 1) {
                console.log('write success--->>', path);
            }
        }
    });
}

let modifySDKPath = function (path) {
    let fRead = fs.createReadStream(path);
    let objReadline = readline.createInterface({
        input: fRead,
        terminal: true
    });
    let arr = new Array();
    objReadline.on('line', function (line) {
        if (line.indexOf(originSDKPath) !== -1) {
            line = endSDKPath;
        }
        arr.push(line);
    });

    objReadline.on('close', function () {
        let fWrite = fs.createWriteStream(path);
        for (let i = 0; i < arr.length; i++) {
            let line = arr[i];
            fWrite.write(line + os.EOL);
            if (i === arr.length - 1) {
                console.log('write success--->>', path);
            }
        }
    });
}

// login_logo.png  logo.png
//! 将srcPath路径的文件复制到tarPath
let copyFile = function (srcPath, tarPath, cb) {
    let fileName = path.basename(srcPath);
    console.log("fileName-->>", fileName)
    //剔除intermediates 下的文件
    if (srcPath.indexOf("intermediates") === -1) {
        if (fileName === "AndroidManifest.xml" || fileName === "Constants.java" || fileName === "MyApplication.java" || fileName === "build.gradle" || fileName === "strings.xml" || fileName === "local.properties") {
            modifyFileList.push(tarPath);
        }
        for (let i = 0; i < tarPathPicList.length; i++) {
            let picName = tarPathPicList[i];
            if (fileName === picName) {
                modifyPicList.push(tarPath);
            }
        }
    }

    let rs = fs.createReadStream(srcPath);
    rs.on('error', function (err) {
        if (err) {
            console.log('read error', srcPath);
        }
        cb && cb(err);
    })

    let ws = fs.createWriteStream(tarPath);
    ws.on('error', function (err) {
        if (err) {
            console.log('write error', tarPath);
        }
        cb && cb(err);
    })
    ws.on('close', function (ex) {
        cb && cb(ex);
    })

    rs.pipe(ws);
}

//! 将srcDir文件下的文件、文件夹递归的复制到tarDir下
let copyFolder = function (srcDir, tarDir, cb) {
    fs.readdir(srcDir, function (err, files) {
        // console.log("files---->>>", files);
        let count = 0;
        let checkEnd = function () {
            ++count == files.length && cb && cb();
        }

        if (err) {
            checkEnd();
            return;
        }

        files.forEach(function (file) {
            let srcPath = path.join(srcDir, file);
            let tarPath = path.join(tarDir, file);

            fs.stat(srcPath, function (err, stats) {
                if (stats.isDirectory()) {
                    // console.log('mkdir', tarPath);
                    fs.mkdir(tarPath, function (err) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        copyFolder(srcPath, tarPath, checkEnd);
                    });
                } else {
                    copyFile(srcPath, tarPath, checkEnd);
                }
            });
        });

        //为空时直接回调
        files.length === 0 && cb && cb();
    });
}

//初始化变量
function init(result) {
    curPinYinName = result['root']['curPinYinName'][0];
    originPinYinName = result['root']['originPinYinName'][0];
    originAppName = result['root']['originAppName'][0];
    curAppName = result['root']['curAppName'][0];
    srcDir = result['root']['srcDir'][0];
    url = result['root']['url'][0];
    basePicPath = result['root']['basePicPath'][0];
    sdkPath = result['root']['sdk'][0];
    isPacker = result['root']['isPacker'][0];
    isReplaceImg = result['root']['isReplaceImg'][0];
    //替换字符串
    originXMLStr = `android:authorities="com.example.qicheng.${originPinYinName}.fileProvider"`;
    endXMLStr = `android:authorities="com.example.qicheng.${curPinYinName}.fileProvider"`;

    originGradleStr = `com.example.qicheng.${originPinYinName}"`;
    endGradleStr = `com.example.qicheng.${curPinYinName}"`;

    originUrlStr = "public static final String URL";
    endUrlStr = `        public static final String URL = "${url}";`

    originAppStr = `com.example.qicheng.${originPinYinName}`;
    endAppStr = `            String MAIN_PROCESS_NAME = "com.example.qicheng.${curPinYinName}";`

    originAppNameStr = `name="app_name"`;
    endAppNameStr = `    <string name="app_name">${curAppName}</string>`;

    originSDKPath = "sdk.dir";

    endSDKPath = `sdk.dir=${sdkPath}`

    //读取文件下的图片名
    fs.readdir(basePicPath, function (err, files) {
        console.log(files);
        tarPathPicList = files;
    });
}

function main() {
    let data = fs.readFileSync("./config.xml");
    //解析xml配置文件
    parseString(data, (err, result) => {
        if (err) {
            throw err;
        }
        init(result);
    });

    let dir = path.dirname(srcDir);
    tarDir = dir + "\\" + curPinYinName
    fs.mkdir(tarDir, function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("目录创建成功。");
    });
    copyFolder(srcDir, tarDir, () => {
        //包名修改
        modifyPacker();
        if (isReplaceImg == "true") {
            //图片替换
            modifyPicFun();
        }
    });
}

main();
// AndroidPacker();