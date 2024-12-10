export const devLog = (level:'INFO'|'DEBUG',text:string, data:any) => {
    if(ENV.PROD) {
      if(ENV.LOG_LEVEL&&ENV.LOG_LEVEL==='DEBUG') {
        console.log(level+": ",text,": ",data)
      } else {
        if(level==='INFO') {
          console.log(level+": ",text,": ",data)
        }
      }
    } else {
      console.log(level+": ",text,": ",data)
    }
  }