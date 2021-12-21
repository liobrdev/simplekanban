import { DraggableLocation } from 'react-beautiful-dnd';
import { ITask } from '@/types';


export const moveTasks = (
  tasks: ITask[],
  destination: DraggableLocation | undefined,
  draggableId: string | number,
  source: DraggableLocation,
): ITask[] => {
  if (!destination) return tasks;

  let newIndex = destination.index;

  const destinationTaskCount = tasks.filter(task => (
    task.column === +destination.droppableId
  )).length;

  if (destination.droppableId === source.droppableId) {
    if (newIndex >= destinationTaskCount) {
      newIndex = destinationTaskCount - 1;
    } else if (newIndex < 0) {
      newIndex = 0;
    }

    tasks = tasks.map((task) => {
      if (task.task_id === +draggableId) {
        return { ...task, task_index: newIndex };
      } else if (
        task.column === +destination.droppableId &&
        newIndex > source.index &&
        task.task_id !== +draggableId &&
        task.task_index <= newIndex &&
        task.task_index > source.index
      ) {
        return { ...task, task_index: task.task_index - 1 };
      } else if (
        task.column === +destination.droppableId &&
        newIndex < source.index &&
        task.task_id !== +draggableId &&
        task.task_index < source.index &&
        task.task_index >= newIndex
      ) {
        return { ...task, task_index: task.task_index + 1 };
      }
      return task;
    });
  } else {
    if (newIndex > destinationTaskCount) {
      newIndex = destinationTaskCount;
    } else if (newIndex < 0) {
      newIndex = 0;
    }

    tasks = tasks.map((task) => {
      if (task.task_id === +draggableId) {
        return {
          ...task,
          column: +destination.droppableId,
          task_index: newIndex,
        };
      } else if (
        task.column === +source.droppableId &&
        task.task_index > source.index
      ) {
        return { ...task, task_index: task.task_index - 1 };
      } else if (
        task.column === +destination.droppableId &&
        task.task_index >= destination.index
      ) {
        return { ...task, task_index: task.task_index + 1 };
      }
      return task;
    });
  }

  return tasks;
};