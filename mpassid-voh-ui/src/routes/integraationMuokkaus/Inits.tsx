

export const inits:any = {
    idp: {
      wilma: {
        id: 0,
        configurationEntity: {
            attributes: [
                {
                    type: "data",
                    name: "datasource",
                    content: "wilma"
                },
                {
                    type: "data",
                    name: "hostname",
                    content: "nykarleby.inschool.fi"
                }
            ],
            idp: {
                type: "wilma",
                institutionTypes: [
                    11,
                    15
                ],
                idpId: "wilma_nykarleby",
                logoUrl: "https://mpass-proxy.csc.fi/images/buttons/btn-nykarleby.png",
                flowName: "WilmaNykarleby",
                hostname: "nykarleby.inschool.fi"
            }
        },
        discoveryInformation: {
            title: "Nykarleby",
            showSchools: true,
            schools: [],
            excludedSchools: [],
            earlyEducationProvider: false
        },
        deploymentPhase: 1,
    }
    },
    sp: {},
    set: {}
  };