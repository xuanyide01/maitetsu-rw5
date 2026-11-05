export function imagePath(key){if(!/^[a-f0-9]{16}\.(png|jpg)$/.test(key))throw Error("图片资源无效");return "/common/images/"+key;}
