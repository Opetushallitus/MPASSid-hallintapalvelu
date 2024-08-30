import { FormattedMessage } from 'react-intl';
import { devLog } from './devLog';

const validateUri = (value:string) => {
      
    var urlPattern = new RegExp('^((http|https):\\/\\/)'+ // validate protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
      '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
      return !!urlPattern.test(value);

  }

  const validateHttps = (value:string) => {
      
    var urlPattern = new RegExp('^((https):\\/\\/)'); 
      return !!urlPattern.test(value);

  }  

const validateIpAddress = (value:string) => {
      
    const urlPattern = new RegExp('^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$'); 
    return !!urlPattern.test(value);

  }

const validateHostname = (value:string) => {
      
    const urlPattern = new RegExp('^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$'); 
    return !!urlPattern.test(value);

}

const validateNumber = (value:string) => {
      
    const urlPattern = new RegExp('^([0-9]*)$'); 
    return !!urlPattern.test(value);

}

const validateNoHash = (value:string) => {
      
    const urlPattern = new RegExp('^[^#]+$'); 
    return !!urlPattern.test(value);

}

export const validate = (validators:string[],value:string) => {
    let validateStatus:boolean=true;
    validators.forEach(validator=>{
        if(validateStatus) {
            switch (validator)
            {
                case "notempty":
                    if(value===undefined||value==='') {                        
                        validateStatus=false
                    }
                    break;
                case "hostname":
                    validateStatus=validateHostname(value);
                    break;
                case "uri":
                        validateStatus=validateUri(value);
                        devLog("validate uri",value)
                        devLog("validate uri",validateStatus)
                    break;    
                case "ip":
                    validateStatus=validateIpAddress(value);
                    break;
                case "number":
                    validateStatus=validateNumber(value);
                    break; 
                case "nohash":
                    validateStatus=validateNoHash(value);
                    break;    
                    case "https":
                        validateStatus=validateHttps(value);
                        break;        
                default:
                    validateStatus=false;
                    console.warn("Unknown validation: ",validator)
                    break;
                }
            }
    })
    return validateStatus;
    
}

export const helperText = (validators:string[],value:string) => {
    let validateStatus:boolean=true;
    let helperText:JSX.Element=<></>;
    validators.forEach(validator=>{
        if(validateStatus) {
            switch (validator)
            {
                case "notempty":
                    if(value===undefined||value==='') {
                        validateStatus=false
                    }
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="kentän arvon pitää olla vähintään yhden merkin!" />
                    }
                    break;
                case "hostname":
                    validateStatus=validateHostname(value);
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="hostname ei ole validi!" />
                    }
                    break;
                case "uri":
                    validateStatus=validateUri(value);
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="uri ei ole validi!" />
                    }
                    break;
                case "ip":
                        validateStatus=validateIpAddress(value);
                        if(!validateStatus) {
                            helperText=<FormattedMessage defaultMessage="ip osoitte ei ole validi!" />
                        }
                        break;  
                case "number":
                    validateStatus=validateIpAddress(value);
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="Kentän arvon pitää olla numero!" />
                    }
                    break;      
                case "nohash":
                    validateStatus=validateNoHash(value);
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="Kentässä ei saa olla # merkkiä!" />
                    }
                    break;
                    case "https":
                        validateStatus=validateHttps(value);
                        if(!validateStatus) {
                            helperText=<FormattedMessage defaultMessage="Kentän pitää olla https muodossa!" />
                        }
                        break;       
                default:
                    validateStatus=false;
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="Tuntematon validointi ehto!" />
                    }
                    
                    break;
                }
            }
    })
    
    return(helperText)
}


/*
TODO: validator for certificate, e.g. using 

https://github.com/PeculiarVentures/x509

npm install @peculiar/x509

import { X509Certificate } from '@peculiar/x509';

const cert = new X509Certificate(inputRef.current!.value);
      const certDetails = {
        subject: cert.subjectName,
        issuer: cert.issuerName,
        validFrom: cert.notBefore,
        validTo: cert.notAfter,
        serialNumber: cert.serialNumber,
      };

*/      