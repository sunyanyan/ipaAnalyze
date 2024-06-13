const fs = require("fs");
const execSync = require('child_process').execSync
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);
const fsPromiseAccess = util.promisify(require('node:fs').access);
const fsPromiseWriteFile = util.promisify(require('node:fs').writeFile);
const fsPromiseReaddir = util.promisify(require('node:fs').readdir);
const plist = require('plist');
const linkMapJS = require('./linkmap')

// let ipaFilePath = "./ipaDir/iPhone_popo_2022_09_22_1663833862.ipa"
const ipaDirPath = "./INPUT/"
const appDirPath = "./TempPayload/Payload/POPO.app"
const appInfoPlistPath = appDirPath + "/Info.plist"
const outputDirPath = "./OUTPUT/"
const outputJSONSumPath = "./OUTPUT/ipaSum.json"
const templateHTMLPath = "./OUTPUT/template.html"
const indexHTMLPath = "./OUTPUT/index.html"



/**
 * 普通字符串转成字符串模板 
 * @param {*} params 字符串模板中所需信息 比如 ${TEMP} 需要 {"TEMP":TEMP}
 * @returns 
 */
String.prototype.interpolate = function (params) {
    const names = Object.keys(params);
    const vals = Object.values(params);
    return new Function(...names, `return \`${this}\`;`)(...vals);
};

async function execAyncAwait(cmdStr) {
    const { stdout, stderr } = await exec(cmdStr);
    console.log('stdout:', stdout);
    console.error('stderr:', stderr);
    return stdout;
}

/**
 * 获取文件大小
 * （获取准确的与磁盘对得上
 */
function fsGetSizeMB(filePath) {
    // console.log("-->开始 获取 "+filePath+" 的文件大小")
    let fileStat = fs.statSync(filePath)
    let fileSizeB = fileStat.size;
    // console.log(filePath+":fileSizeB:"+fileSizeB+"B")
    let fileSizeMB = fileSizeB / 1024.0 / 1024.0;
    fileSizeMB = fileSizeMB.toFixed(2)
    // console.log("fileSizeMB:"+fileSizeMB+"MB")
    return fileSizeMB;
}
/**
 * 获取文件夹大小
 * 与磁盘大小有点差距啊
 * @param {*} filePath 
 * @returns 
 */
async function shellDUGetSizeMB(filePath) {
    let { stdout, stderr } = await exec("du -sk " + filePath + " | awk '{print $1}'");
    // console.log("stdout:",stdout)
    let dirSize = 0.00;
    if (stdout) {
        // console.log(filePath+":size:"+stdout+"kb")
        dirSize = stdout / 1024;
        dirSize = dirSize.toFixed(2)
    }
    if (stderr) {
        console.log(filePath + ":stderr:", stderr)
    }
    // console.log(filePath+":文件夹大小:"+dirSize+"MB")
    return dirSize;
}
/*
 * 获取包含 type名字 文件(夹)大小
 * 与磁盘大小有点差距啊
*/
async function shellDUGetTypesSizeMB(filePath, type) {
    let { stdout, stderr } = await exec("du -sk " + filePath + "/*" + " | grep '" + type + "$' | awk '{sum+=$1} END {print sum}'");
    // console.log("stdout:",stdout)
    let dirSize = 0.00;
    if (stdout) {
        dirSize = stdout / 1024;
        dirSize = dirSize.toFixed(2)
    }
    if (stderr) {
        console.log(filePath + ":stderr:", stderr)
    }
    // console.log(filePath+":文件夹大小:"+dirSize+"MB")
    return dirSize;
}


function unzipIpa(ipaPath) {
    console.log("   (*^▽^*)开始 解压缩 ipa 文件成 app 文件夹")
    execSync('bash ./unzipIpa.sh  ' + ipaPath)
    console.log("   (*^▽^*) unzipIpa END")
}

async function getAppSize() {
    // console.log("-->开始 获取 app 的文件大小")

    //拿不到
    // let appDirStat = fs.statSync(appDirPath)
    // console.log(appDirStat)

    let appDirSize = await shellDUGetSizeMB(appDirPath);

    // console.log("app文件夹大小:"+appDirSize+"MB")
    return appDirSize;
}

async function getInfoSize(app_path) {

    console.log("     (*^▽^*)开始获取大致信息")

    // # Frameworks，动态库存放路径；
    // # PlugIns，插件存放路径，如today extension；
    // # Mach-O,可执行文件； exec格式的xxx：   可执行包
    // # Assets.car，Asset Catalog编译产物；
    // # bundle，主要存放资源文件；
    // ploj 文件夹 翻译大小
    // 图片资源总大小
    // 视频资源
    // 字体

    let resultJson = {}

    let execFileSize = 0.0
    let exec_path = app_path + "/POPO"
    execFileSize = fsGetSizeMB(exec_path)
    // console.log("mach-o execFileSize:" + execFileSize + "MB")
    resultJson["exec_Size"] = execFileSize;

    let assets_car_path = app_path + "/Assets.car"
    let assets_size = fsGetSizeMB(assets_car_path);
    // console.log("assets_size:"+assets_size+"MB")
    resultJson["assets_size"] = assets_size;

    //递归所有当前目录和所有子目录的bundle
    // let allBundlesSize = 0.0;
    // {
    //     let {stdout,stderr} = await exec("du -ck "+app_path+" | grep 'bundle$' | awk '{sum+=$1} END {print sum}'")
    //     if(stdout){
    //         allBundlesSize =  stdout;
    //     }
    //     if(stderr){
    //         console.log("allBundlesSize stderr :",stderr)
    //     }
    //     allBundlesSize = (allBundlesSize / 1024).toFixed(2)        
    //     console.log("allBundlesSize :"+allBundlesSize+"MB")
    // }
    // 没递归子目录
    let allBundlesSize = await shellDUGetTypesSizeMB(app_path,"bundle");
    console.log("allBundlesSize :"+allBundlesSize+"MB")

    let framework_path = app_path+"/Frameworks"
    let framework_size = await shellDUGetTypesSizeMB(app_path,"Frameworks");
    console.log("framework_size:"+framework_size+"MB")

    let plugins_path = app_path+"/PlugIns"
    let plugins_size = await shellDUGetTypesSizeMB(app_path,"PlugIns");
    console.log("plugins_size:"+plugins_size+"MB")

    //有些可能是bundle里的 bundle里的没统计
    let allLprojSize = await shellDUGetTypesSizeMB(app_path,"lproj");
    console.log("allLprojSize :"+allLprojSize+"MB")

    let pngSize = await shellDUGetTypesSizeMB(app_path,"png");
    console.log("pngSize :"+pngSize+"MB")

    let jpgSize = await shellDUGetTypesSizeMB(app_path,"jpg");
    console.log("jpgSize :"+jpgSize+"MB")

    let gifSize = await shellDUGetTypesSizeMB(app_path,"gif");
    console.log("gifSize :"+gifSize+"MB")

    let svgSize = await shellDUGetTypesSizeMB(app_path,"svg");
    console.log("svgSize :"+svgSize+"MB")

    let wavSize = await shellDUGetTypesSizeMB(app_path,"wav");
    console.log("wavSize :"+wavSize+"MB")

    let cafSize = await shellDUGetTypesSizeMB(app_path,"caf");
    console.log("cafSize :"+cafSize+"MB")

    let ttfSize = await shellDUGetTypesSizeMB(app_path,"ttf");
    console.log("ttfSize :"+ttfSize+"MB")

    let nibSize = await shellDUGetTypesSizeMB(app_path,"nib");
    console.log("nibSize :"+nibSize+"MB")

    let jsonSize = await shellDUGetTypesSizeMB(app_path,"json");
    console.log("jsonSize :"+jsonSize+"MB")

    let xmlSize = await shellDUGetTypesSizeMB(app_path,"xml");
    console.log("xmlSize :"+xmlSize+"MB")

    let fileNameArr = [
        "bundle",
        "Frameworks",
        "PlugIns",
        "lproj",
        "png",
        "jpg",
        "gif",
        "svg",
        "wav",
        "caf",
        "ttf",
        "nib",
        "json",
        "xml"
    ]
    for (let i = 0; i < fileNameArr.length; i++) {
        let fileName = fileNameArr[i];
        let size = await shellDUGetTypesSizeMB(app_path, fileName);
        resultJson[fileName + "_size"] = size;
    }
    console.log("     (*^▽^*)获取大致信息END")

    return resultJson
}

async function checkMakeDir(dirPath) {

    try {
        let access = await fsPromiseAccess(dirPath)
        // console.log("access:",access)
        return 1;
    } catch (error) {
        // console.log("error",error)
        fs.mkdirSync(dirPath)

        return 2;
    }

    return 0
}



async function checkWriteFile(filePath, fileContent) {

    try {
        let result = await fsPromiseWriteFile(filePath, fileContent)
        console.log("   (*^▽^*) " + filePath + " 写入成功 result:", result)
        return 1;
    } catch (error) {
        console.log("   o(╥﹏╥)o " + filePath + " 写入失败 error", error)
    }
}

async function checkMakeJsonFile(filePath) {

    try {
        let access = await fsPromiseAccess(filePath)
        // console.log("access:",access)
        return 1;
    } catch (error) {
        // console.log("error",error)
        let obj = {}
        let jsonStr = JSON.stringify(obj, null, "\t")
        await checkWriteFile(filePath, jsonStr)

        return 2;
    }

    return 0;
}

async function ipaAnalyze(ipaPath) {

    console.log("\n(*^▽^*) 开始获取信息:" + ipaPath);

    let ipaSize = fsGetSizeMB(ipaPath)
    // console.log("ipa 文件大小:"+ipaSize+"MB")

    unzipIpa(ipaPath)

    //获取 info.plist 中版本信息
    let obj = plist.parse(fs.readFileSync(appInfoPlistPath, 'utf8'));
    let appversion = obj["CFBundleShortVersionString"]
    let appbuild = obj["CFBundleVersion"]
    console.log("   (*^▽^*) appversion:" + appversion + " appbuild:" + appbuild);

    let appDirSize = await getAppSize();

    let infoSizeJson = await getInfoSize(appDirPath)

    infoSizeJson["ipa_size"] = ipaSize;
    infoSizeJson["app_size"] = appDirSize;
    infoSizeJson["app_build"] = appbuild;
    infoSizeJson["app_version"] = appversion;
    infoSizeJson["info"] = "这里的size单位都为MB";


    // console.log('infoSizeJson :',infoSizeJson)


    await checkMakeDir(outputDirPath)

    let str = JSON.stringify(infoSizeJson, null, "\t")
    let outJsonFilePath = outputDirPath + appversion + "_" + appbuild + ".json"
    await checkWriteFile(outJsonFilePath, str)

    console.log("(*^▽^*) 获取信息 END \n");

    return { appversion, appbuild }
}
/**
 * 处理数据生成图表
 */
async function setupChartData() {
    let allVersionDatas = []
    try {
        //json 文件名
        const files = await fsPromiseReaddir(outputDirPath);
        for (const file of files) {
            if (file.indexOf("json") > 0 && file.indexOf("linkmap") < 0 && file.indexOf("ipaSum") < 0) {
                let curPath = outputDirPath + "" + file
                let jsonStr = fs.readFileSync(curPath, 'utf8')
                let obj = JSON.parse(jsonStr)
                allVersionDatas.push(obj)
            }
        }
    } catch (err) {
        console.error("\n setupChartData function o(╥﹏╥)o err:", err);
    }

    //根据版本号排序
    // allVersionDatas.sort
    //各个版本号
    let ipaVersions = []
    //各个版本号对应的ipa大小
    let ipaVersionSizes = []
    let appConntentTypes = ["exec", "Framework", "bundle", "assets", "PlugIns", "png", "gif", "nib"]
    let appConntentJsonNameTypes = ["exec_Size", "Frameworks_size", "bundle_size", "assets_size", "PlugIns_size", "png_size", "gif_size", "nib_size"]
    let appContentSeries = ""
    let appContentSeries2 = ""
    let appLinkMapSeries = ""

    allVersionDatas.forEach(versiondata => {
        let versionBuild = versiondata.app_version + "_" + versiondata.app_build;
        ipaVersions.push(versionBuild)
        ipaVersionSizes.push(versiondata.ipa_size)

        let appConntentJsonNameTypesArr = new Array()
        appConntentJsonNameTypes.forEach(appConntentJsonNameType => {
            let content = versiondata[appConntentJsonNameType]
            appConntentJsonNameTypesArr.push(content)

        })
        // console.log(JSON.stringify(appConntentJsonNameTypesArr))
        let appContentSerie =
            `
        {
            name: '${versionBuild}',
            type: 'line',
            stack: '',
            data: [${appConntentJsonNameTypesArr}]
          },
          `
        appContentSeries += appContentSerie;



    })

    appConntentJsonNameTypes.forEach(appConntentJsonNameType => {

        let appConntentJsonNameTypesArr = new Array()
        allVersionDatas.forEach(versiondata => {
            let content = versiondata[appConntentJsonNameType]
            appConntentJsonNameTypesArr.push(content)
        })

        let appContentSerie2 =
            `
        {
            name: '${appConntentJsonNameType}',
            type: 'line',
            stack: '',
            data: [${appConntentJsonNameTypesArr}]
          },
          `
        appContentSeries2 += appContentSerie2;

    })



    //linkMap前二十模块大小数据
    let version2linkmapDic = []
    let linkmapTop20ModuleNames = []
    //最新linkMap前二十POPO模块大小
    let newestVersionName = ipaVersions[ipaVersions.length - 1]
    let newestVersionTop20ModuleNames = []
    let newestVersionTop20ModuleSizes = []


    try {
        ipaVersions.forEach(ipaVersion => {
            let linkmapPath = outputDirPath + ipaVersion + "_linkmap.json"
            let jsonStr = fs.readFileSync(linkmapPath, 'utf8')
            let linkmapInfoArrs = JSON.parse(jsonStr)
    
            for (let i = 0; i < 15 && i < linkmapInfoArrs.length; i++) {
                let obj = linkmapInfoArrs[i]
                let name = obj.name;
                if (!linkmapTop20ModuleNames.includes(name)) {
                    linkmapTop20ModuleNames.push(name)
                }
            }
    
            let linkmapInfoDict = []
            linkmapInfoArrs.forEach(linkmapInfo => {
                linkmapInfoDict[linkmapInfo.name] = linkmapInfo.size;
            })
            version2linkmapDic[ipaVersion] = linkmapInfoDict;
        })
        linkmapTop20ModuleNames.forEach(linkmapTop20ModuleName => {
            let linkmapTop20ModuleNameVersionSizes = []
            ipaVersions.forEach(ipaVersion => {
                let linkmapInfoDict = version2linkmapDic[ipaVersion]
                let size = linkmapInfoDict[linkmapTop20ModuleName];
                //原来是B单位 转换成MB
                size = (size / 1024 / 1024).toFixed(2);
                linkmapTop20ModuleNameVersionSizes.push(size)
            })
    
            let appLinkMapSerie =
                `
            {
                name: '${linkmapTop20ModuleName}',
                type: 'bar',
                stack: 'total',
                label: {
                  show: true
                },
                emphasis: {
                  focus: 'series'
                },
                data: [${linkmapTop20ModuleNameVersionSizes}]
              },
          `
            appLinkMapSeries += appLinkMapSerie;
        })
    
    
        //最新linkMap前二十POPO模块大小    
        let linkmapPOPOPath = outputDirPath + newestVersionName + "_linkmap_POPOModule.json"
        let linkmapPOPOPathjsonStr = fs.readFileSync(linkmapPOPOPath, 'utf8')
        let linkmapPOPOPathjsonStrInfoArrs = JSON.parse(linkmapPOPOPathjsonStr)
    
        for (let i = 0; i < 20 && i < linkmapPOPOPathjsonStrInfoArrs.length; i++) {
            let obj = linkmapPOPOPathjsonStrInfoArrs[i]
            let name = obj.name;
            let size = obj.size;
            //原来是B单位 转换成MB
            size = (size / 1024 / 1024).toFixed(2);
            newestVersionTop20ModuleNames.push(name)
            newestVersionTop20ModuleSizes.push(size)
        }
    } catch (error) {
        console.log(" 获取linkmap 信息失败 ：",error)
    }
    



    let templateStr = fs.readFileSync(templateHTMLPath, 'utf8')
    let templateDataObj = {
        "ipaVersions": JSON.stringify(ipaVersions),
        "ipaVersionSizes": JSON.stringify(ipaVersionSizes),
        "appConntentJsonNameTypes": JSON.stringify(appConntentJsonNameTypes),
        "appContentSeries": appContentSeries,
        "appContentSeries2": appContentSeries2,
        "appLinkMapSeries": appLinkMapSeries,
        "newestVersionName": newestVersionName,
        "newestVersionTop20ModuleNames": JSON.stringify(newestVersionTop20ModuleNames),
        "newestVersionTop20ModuleSizes": JSON.stringify(newestVersionTop20ModuleSizes),
    }
    // console.log(templateDataObj)
    let template = templateStr.interpolate(templateDataObj)
    // console.log(template)
    await checkWriteFile(indexHTMLPath, template)
}

async function main() {
    try {
        //获取ipa名字
        const files = await fsPromiseReaddir(ipaDirPath);
        let ipaNameArr = []
        for (const file of files) {
            if (file.indexOf("ipa") > -1) {
                ipaNameArr.push(file)
            }
        }

        await checkMakeJsonFile(outputJSONSumPath)
        let jsonSumStr = fs.readFileSync(outputJSONSumPath, 'utf8')
        let jsonSum = JSON.parse(jsonSumStr)

        //遍历解析ipa信息 和同名的linkmap信息
        for (const file of ipaNameArr) {
            //判断是否解析过
            if (jsonSum[file]) {
                console.log(file + " :已经解析过了 跳过解析 !")
            } else {
                //遍历解析ipa信息
                let curPath = ipaDirPath + "" + file
                let ipaInfo = await ipaAnalyze(curPath)
                let versionInfo = ipaInfo.appversion + "_" + ipaInfo.appbuild;
                let linkMapName = file.split(".")[0] + ".txt";

                //解析linkmap文件
                try {
                    let linkmapInputFilePath = ipaDirPath + "" + linkMapName
                    let linkmapOutputFilePath = outputDirPath + "" + versionInfo + "_linkmap.json"
                    await linkMapJS.linkMapMain(linkmapInputFilePath,linkmapOutputFilePath,true)    
                } catch (error) {
                    console.error(file+" 对应的linkmap 没找到！ ",error)
                }
                


                jsonSum[file] = versionInfo;
            }
        }

        await checkWriteFile(outputJSONSumPath,JSON.stringify(jsonSum,null,"\t"))

        await setupChartData();

    } catch (err) {
        console.error("\n main function o(╥﹏╥)o err:", err);
    }

    await setupChartData();


}

main()

// linkMapJS.linkMapMain("./INPUT/iPhone_popo_2022_09_22_1663833862.txt","./testLinkmap.json",true)