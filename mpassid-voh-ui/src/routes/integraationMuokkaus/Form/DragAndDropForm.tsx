import React, { useState } from 'react';
import './DragAndDropForm.css';
import { FormattedMessage } from 'react-intl';
import { Grid, IconButton } from '@mui/material';
import Clear from '@mui/icons-material/Clear';
import { createLogger } from '@/utils/devLog';

const debugLog = createLogger("DEBUG");

interface FileUploaderInterface {
  fileExist: boolean;
  mandatoryColor: boolean;
  emptyFiles: boolean; 
  onFilesDrop?: (files: File[], event: React.DragEvent) => void | Promise<void>;
  onDelete: () => void;
}

function FileUploader({ onFilesDrop, onDelete, fileExist=true, emptyFiles=false, mandatoryColor=false }: FileUploaderInterface) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // emptyFiles turning false clears the chosen files (adjusted while
  // rendering instead of in an effect).
  const [prevEmptyFiles, setPrevEmptyFiles] = useState(emptyFiles);
  if(emptyFiles!==prevEmptyFiles) {
    setPrevEmptyFiles(emptyFiles);
    if(!emptyFiles) {
      setFiles([]);
    }
  }

  /**
   * This function is responsible for handle drop event for drag and drop input and executing
   * trigger onFilesDrop prop by passing files and the event as params
   * @param event drag event
   */
  const handleDrop = async (event: React.DragEvent) => {
    // Must run synchronously: after an await the browser has already handled the drop.
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const files = Object.values(event.dataTransfer.files);

    debugLog('files =>', files);

    setFiles(files);

    if (onFilesDrop) {
      await onFilesDrop(files, event);
    }
  };

  //------ Necessary functions for onDrop event to behave correctly. Don't remove !
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);    
  };

  //remove selected files
  const handleRemoveFiles = () => {
    onDelete();
    setFiles([]);
    setIsDragging(false);
  };
  
  return (
    <div className="input-container">
      <div
        //className={(fileExist)?"input-zone" :(isDragging) ? "input-zone-missing drag-over" : "input-zone-missing"}
        className={(fileExist)?"input-zone" :(isDragging) ? (mandatoryColor) ? "input-zone-missing drag-over" : "input-zone-grey drag-over" : (mandatoryColor) ? "input-zone-missing" : "input-zone-grey"}        
        onDrop={(event) => handleDrop(event)}
        onDragEnter={(event) => handleDragEnter(event)}
        onDragLeave={(event) => handleDragLeave(event)}
        onDragOver={(event) => handleDragOver(event)}
        
      >
        {files.length===0&&<FormattedMessage defaultMessage="Drag & Drop metadata file" />}

        {files.length===1&&                             
            <Grid>
                <IconButton onClick={()=>handleRemoveFiles()}>
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