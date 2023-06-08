import * as React from 'react';
import Popover from '@mui/material/Popover';
import Button from '@mui/material/Button';
import { useIntegrationSafe } from '@/api';
import type { Components } from "@/api";

interface Props {
    id: number;
}

export default function BasicPopover({ id }: Props) {
    const [error, integration] = useIntegrationSafe({ id });

    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const popoverId = open ? 'simple-popover' : undefined;

    type ServiceProvider = Components.Schemas.OidcServiceProvider | Components.Schemas.SamlServiceProvider;

    const getId = (sp: ServiceProvider) => {
        if ("clientId" in sp) {
            return sp.clientId;
        } else if ("entityId" in sp) {
            return sp.entityId;
        } else {
            console.log("Unknown");
            return "Unknown";
        }
    };

    return (
        <div>
            <Button aria-describedby={popoverId} variant="contained" onClick={handleClick}>
                Sallitut palvelut
            </Button>
            <Popover
                id={popoverId}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 50,
                }}
            >
                    {integration.configurationEntity?.idp?.allowedServiceProviders?.length ?
                        integration.configurationEntity?.idp?.allowedServiceProviders?.map((sp: ServiceProvider) =>
                            <div style={{ margin: '5px' }} key={getId(sp)}>
                                {
                                    getId(sp)
                                }
                            </div>
                        ) : [] }
            </Popover>
        </div>
    );
}