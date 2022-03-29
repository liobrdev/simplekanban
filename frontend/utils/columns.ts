import { IColumn } from '@/types';


interface IAdjacentColumns {
  leftColumn?: IColumn;
  rightColumn?: IColumn;
}


export const checkAdjacentColumns = (
  thisColumnId?: number,
  columns?: IColumn[],
): IAdjacentColumns => {
  if (!thisColumnId || !columns || columns.length < 2) return {};
  
  let leftColumn: IColumn | undefined = undefined;
  let rightColumn: IColumn | undefined = undefined;
  
  columns.find((column, index, array) => {
    if (column.column_id === thisColumnId) {
      if (array[index - 1]?.column_index === column.column_index - 1) {
        leftColumn = array[index - 1];
      }
      
      if (array[index + 1]?.column_index === column.column_index + 1) {
        rightColumn = array[index + 1];
      }
      
      return true;
    }
    
    return false;
  });
  
  return { leftColumn, rightColumn };
};


export const deleteColumn = (index: number, columns: IColumn[]): IColumn[] => {
  for (let i = index + 1; i < columns.length; i++) {
    columns[i].column_index = columns[i].column_index - 1;
  }
  columns.splice(index, 1);
  return columns;
};


export const moveColumn = (
  columnId: number,
  oldIndex: number,
  newIndex: number,
  columns: IColumn[],
): IColumn[] => {
  const numColumns = columns.length;

  if (newIndex >= numColumns){
    newIndex = numColumns - 1
  } else if (newIndex < 0) {
    newIndex = 0;
  }

  if (newIndex < oldIndex) {
    columns = columns.map(c => {
      if (
        c.column_id !== columnId
        && c.column_index < oldIndex && c.column_index >= newIndex
      ) {
        c.column_index = c.column_index + 1;
      } else if (c.column_id === columnId) {
        c.column_index = newIndex;
      }
      return c;
    });
  } else if (newIndex > oldIndex) {
    columns = columns.map(c => {
      if (
        c.column_id !== columnId
        && c.column_index <= newIndex && c.column_index > oldIndex
      ) {
        c.column_index = c.column_index - 1;
      } else if (c.column_id === columnId) {
        c.column_index = newIndex;
      }
      return c;
    });
  }

  return columns
};
