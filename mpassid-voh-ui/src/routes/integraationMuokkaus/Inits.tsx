export const inits = {
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
                    content: "mansikkala.inschool.fi"
                }
            ],
            idp: {
                type: "wilma",
                institutionTypes: [
                    11,
                    15
                ],
                idpId: "wilma_mansikkala",
                logoUrl: "https://mpass-proxy.csc.fi/images/buttons/btn-mansikkala.png",
                flowName: "WilmaMansikkala",
                hostname: "mansikkala.inschool.fi"
            }
        },
        discoveryInformation: {
            title: "Mansikkala",
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