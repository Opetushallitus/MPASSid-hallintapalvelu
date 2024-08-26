import { FormattedMessage } from 'react-intl';

const validateUri = (value:string) => {
      
    var urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
      '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
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

const logValidateValue = (value:String) => {  
    return true;
  }

export const validate = (validators:string[],value:string) => {
    let validateStatus:boolean=true;
    validators.forEach(validator=>{
        if(validateStatus&&value!='') {
            switch (validator)
            {
                case "mandatory":
                    if(!value||value==='') {
                        validateStatus=false
                    }
                    break;
                case "hostname":
                    validateStatus=validateHostname(value);
                    break;
                case "uri":
                        validateStatus=validateUri(value);
                    break;    
                case "ip":
                    validateStatus=validateIpAddress(value);
                    break;
                case "number":
                    validateStatus=validateNumber(value);
                    break;    
                default:
                    validateStatus=false;
                    console.warn("Unknown validation!")
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
                case "mandatory":
                    if(!value||value==='') {
                        validateStatus=false
                    }
                    if(!validateStatus) {
                        helperText=<FormattedMessage defaultMessage="kenttä on pakollinen!" />
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


