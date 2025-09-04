import { FormattedMessage } from 'react-intl';
import { devLog } from './devLog';
import { X509Certificate } from '@peculiar/x509';

const validateDn = (value:string) => {

    var regExpPattern = new RegExp('^((UID|uid=([^,]*)),)?((CN=([^,]*)),)?((((?:CN|OU|cn|ou)=[^,]+,?)+),)?((?:DC|dc=[^,]+,?)+)$')
    return !!regExpPattern.test(value);

}

const validateUri = (value:string) => {
    
    var regExpPattern = new RegExp('^((http|https):\\/\\/)'+ // validate protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|localhost|'+ // validate domain name 
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_@.:~+]*)*'+ // validate port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
      '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
      return !!regExpPattern.test(value);

  }

  const validateHttps = (value:string) => {
      
    var regExpPattern = new RegExp('^((https):\\/\\/)'); 
      return !!regExpPattern.test(value);

  }  

const validateIpAddress = (value:string) => {
      
    const regExpPattern = new RegExp('^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$'); 
    return !!regExpPattern.test(value);

  }

const validateHostname = (value:string) => {
      
    const regExpPattern = new RegExp('^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$'); 
    return !!regExpPattern.test(value);

}

const validateNumber = (value:string) => {
      
    const regExpPattern = new RegExp('^([0-9]*)$'); 
    return !!regExpPattern.test(value);

}

const validateNoHash = (value:string) => {
      
    const regExpPattern = new RegExp('^[^#]+$'); 
    return !!regExpPattern.test(value);

}

const validateNoLocalhost = (value:string) => {
    const regExpPattern = new RegExp('^((?!localhost|127.0.0.1).)*$'); 
    return !!regExpPattern.test(value);
    
}

const validateDate = (value:string) => {
    const regExpPattern = new RegExp('^(0[1-9]|[1-2][0-9]|3[0-1])-(0[1-9]|1[0-2])-20[0-9]{2}$'); 
    return !!regExpPattern.test(value);
    
}

export function trimCertificate(pem:string) {
    const base64Cert = pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\n| |\r/g, '').trim();
    return base64Cert;    
}

const validateCert = (value:string) => {
    
    if(value||value!=='') {
        try {
            devLog("DEBUG","trimmed cert",trimCertificate(value))
            const cert = new X509Certificate(trimCertificate(value));
        
            const certDetails = {
                subject: cert.subjectName,
                issuer: cert.issuerName,
                validFrom: cert.notBefore,
                validTo: cert.notAfter,
                serialNumber: cert.serialNumber,
            };
            devLog("DEBUG","certDetails",certDetails)
            const currentDate = new Date();
            const futureDate = new Date();
            futureDate.setMonth(currentDate.getMonth() + 6);
            if(currentDate  < certDetails.validFrom) {
                devLog("DEBUG","Cert is not yet valid",certDetails.validFrom)
            } 
            if(currentDate  > certDetails.validTo) {
                devLog("DEBUG","Cert is not valid",certDetails.validTo)
            } else {
                if(certDetails.validTo < futureDate) {
                    devLog("DEBUG","Cert is valid less than 6kk",certDetails.validTo)
                } else {
                devLog("DEBUG","Cert is valid more than 6kk",certDetails.validTo)
                }
            }
            
            
            return true;
        } catch (error) {
            return false
        }
        
    } else {
        return false;
    }
    
}

const validateCertText = (value:string) => {
    
    if(value||value!=='') {
        try {
            devLog("DEBUG","trimmed cert",trimCertificate(value))
            const cert = new X509Certificate(trimCertificate(value));
                
            const certDetails = {
                subject: cert.subjectName,
                issuer: cert.issuerName,
                validFrom: cert.notBefore,
                validTo: cert.notAfter,
                serialNumber: cert.serialNumber,
            };
            devLog("DEBUG","certDetails",certDetails)
            const currentDate = new Date();
            const futureDate = new Date();
            futureDate.setMonth(currentDate.getMonth() + 6);
            if(currentDate  < certDetails.validFrom) {
                return(<FormattedMessage defaultMessage="Certificate ei ole vielä validi: {validFrom}" values={{validFrom: certDetails.validFrom.toLocaleDateString()}} />)
            } 
            if(currentDate  > certDetails.validTo) {
                return(<FormattedMessage defaultMessage="Certificate ei ole enään validi: {validTo}" values={{validTo: certDetails.validTo.toLocaleDateString()}} />)
            } else {
                if(certDetails.validTo < futureDate) {
                    return(<FormattedMessage defaultMessage="Certificate on validi alle 6kk: {validTo}" values={{validTo: certDetails.validTo.toLocaleDateString()}} />)        
                }
            }
            return(<></>);    
        } catch (error) {
            return (<FormattedMessage defaultMessage="Ei validi certificate!" />);
        }
        
    } else {
        return(<></>);
    }
    
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
                        devLog("DEBUG","validate uri",value)
                        devLog("DEBUG","validate uri",validateStatus)
                    break;    
                case "ip":
                    validateStatus=validateIpAddress(value);
                    break;
                case "binddn":
                    validateStatus=validateDn(value);
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
                case "nolocalhost":
                    validateStatus=validateNoLocalhost(value);
                    break;
                case "cert":
                    validateStatus=validateCert(value);
                    break;
                case "date":
                    validateStatus=validateDate(value);
                    break;    
                case "expert":
                    validateStatus=true;
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
                case "binddn":
                    validateStatus=validateDn(value);
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="bind dn ei ole validi!" />
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
                case "nolocalhost":
                    validateStatus=validateNoLocalhost(value);
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="Localhost ei ole sallittu!" />
                    }
                    break;
                case "cert":
                    helperText=validateCertText(value)                    
                    break;   
                case "date":
                    validateStatus=validateDate(value);
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="Kentän pitää olla pp-kk-vvvv muodossa!" />
                    }
                    break;
                case "expert":
                    helperText=<FormattedMessage defaultMessage="VAROITUS älä koske tähän jollei erikseen ohjeistettu!" />                    
                    break;
                case "extraExcludes":
                    helperText=<FormattedMessage defaultMessage="Kaikki muihin integraatiohin lisätyt koulut lisätään automaattisesti" />                    
                    break;
                case "allSchoolsUsed":
                    helperText=<FormattedMessage defaultMessage="Kaikki koulut ovat jo käytössä muissa integraatioissa" />                    
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
