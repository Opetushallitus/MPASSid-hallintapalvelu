import React, { useEffect, useState } from 'react';
import './DragAndDropForm.css';
import { FormattedMessage } from 'react-intl';
import { Grid, IconButton } from '@mui/material';
import Clear from '@mui/icons-material/Clear';
import { devLog } from '@/utils/devLog';

interface FileUploaderInterface {
  fileExist: boolean;
  emptyFiles: boolean; 
  onFilesDrop?: (files: File[], event: React.DragEvent) => any;
  onDelete: () => void;
}

function FileUploader({ onFilesDrop, onDelete, fileExist=true, emptyFiles=false }: FileUploaderInterface) {
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {  
    if(!emptyFiles) {
      setFiles([]);
    }    
  }, [setFiles,emptyFiles]);

  /**
   * This function is responsible for handle drop event for drag and drop input and executing
   * trigger onFilesDrop prop by passing files and the event as params
   * @param event drag event
   */
  const handleDrop = async (event: React.DragEvent) => {
    let files = Object.values(event.dataTransfer.files);

    console.log('files =>', files);

    setFiles(files);

    if (onFilesDrop) {
      await onFilesDrop(files, event);
    }

    event.preventDefault();
    event.stopPropagation();
  };

  //------ Necessary functions for onDrop event to behave correctly. Don't remove !
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  //remove selected files
  const handleRemoveFiles = () => {
    onDelete();
    setFiles([]);
  };

  return (
    <div className="input-container">
      <div
        className={(fileExist)?"input-zone":"input-zone-missing"}
        onDrop={(event) => handleDrop(event)}
        onDragEnter={(event) => handleDragEnter(event)}
        onDragLeave={(event) => handleDragLeave(event)}
        onDragOver={(event) => handleDragOver(event)}
        
      >
        {files.length===0&&<FormattedMessage defaultMessage="Drag & Drop metadata file" />}

        {files.length===1&&                             
            <Grid>
                <IconButton onClick={(event)=>handleRemoveFiles()}>
                    <Clear />
                </IconButton>
                <FormattedMessage defaultMessage="{filename}" values={{ filename: files[0].name}} />
            </Grid>            
        }
        
        {files.length>1&&<FormattedMessage defaultMessage="Drag & Drop only one metadata file" />}
        
      </div>
    </div>
  );
}

export default FileUploader;