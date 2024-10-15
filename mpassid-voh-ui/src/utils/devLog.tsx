export const devLog = (text:string, data:any) => {
    if(!ENV.PROD) {
      console.log("DEBUG: ",text,": ",data)
    } else {
      console.log("DEBUG: ",text,": ",data)
    }
  }