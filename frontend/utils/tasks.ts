import { ITask } from '@/types';


export const deleteTask = (
  column_id: number,
  task_index: number,
  tasks: ITask[],
): ITask[] => {
  for (let i = tasks.length - 1; i >= 0; i--) {
    if (tasks[i].column === column_id) {
      if (tasks[i].task_index > task_index) {
        tasks[i].task_index = tasks[i].task_index - 1;
      } else if (tasks[i].task_index === task_index) {
        tasks.splice(i, 1);
      }
    }
  }

  return tasks;
};


export const moveTasks = (
  taskId: number,
  oldIndex: number,
  newIndex: number,
  oldColumnId: number,
  newColumnId: number,
  tasks: ITask[],
): ITask[] => {
  const destinationTaskCount =
    tasks.filter(t => t.column === newColumnId).length;

  if (newColumnId === oldColumnId) {
    if (newIndex >= destinationTaskCount) {
      newIndex = destinationTaskCount - 1;
    } else if (newIndex < 0) {
      newIndex = 0;
    }

    tasks = tasks.map(t => {
      if (t.task_id === taskId) {
        return { ...t, task_index: newIndex };
      } else if (
        t.column === newColumnId
        && newIndex > oldIndex
        && t.task_id !== taskId
        && t.task_index <= newIndex
        && t.task_index > oldIndex
      ) {
        return { ...t, task_index: t.task_index - 1 };
      } else if (
        t.column === newColumnId &&
        newIndex < oldIndex &&
        t.task_id !== taskId &&
        t.task_index < oldIndex &&
        t.task_index >= newIndex
      ) {
        return { ...t, task_index: t.task_index + 1 };
      }
      return t;
    });
  } else {
    if (newIndex > destinationTaskCount) {
      newIndex = destinationTaskCount;
    } else if (newIndex < 0) {
      newIndex = 0;
    }

    tasks = tasks.map(t => {
      if (t.task_id === taskId) {
        return { ...t, column: newColumnId, task_index: newIndex };
      } else if (t.column === oldColumnId && t.task_index > oldIndex) {
        return { ...t, task_index: t.task_index - 1 };
      } else if (t.column === newColumnId && t.task_index >= newIndex) {
        return { ...t, task_index: t.task_index + 1 };
      }
      return t;
    });
  }

  return tasks;
};
