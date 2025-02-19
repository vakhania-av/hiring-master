import { IExecutor } from './Executor';
import ITask from './Task';

export default async function run(executor: IExecutor, queue: AsyncIterable<ITask>, maxThreads = 0) {
    maxThreads = Math.max(0, maxThreads);
    /**
     * Код надо писать сюда
     * Тут что-то вызываем в правильном порядке executor.executeTask для тасков из очереди queue
     */

    return new Promise((resolve, reject) => {
        const runningTasks = new Set<number>(),
            localQueue: ITask[] = [];

        const next = (): void => {
            const processedTasks = [];

            for (const task of localQueue) {
                const { targetId } = task;

                if (!!maxThreads && runningTasks.size >= maxThreads) {
                    break;
                }

                if (!!runningTasks.has(targetId)) {
                    continue;
                }

                runningTasks.add(targetId);

                const processedTask = new Promise((resolve, reject) => {
                    executor.executeTask(task)
                        .then(() => {
                            runningTasks.delete(targetId);

                            const searchedIndex = localQueue.indexOf(task);

                            localQueue.splice(searchedIndex, 1);
                            resolve(true);
                        })
                        .catch(err => {
                            reject(err);
                        }
                    );
                });

                processedTasks.push(processedTask);
                Promise.all(processedTasks).then(() => addToLocalQueue());
            }
        };

        const addToLocalQueue = async (): Promise<void> => {
            if (!queue) {
                console.error('>>>>No data received from queue>>>>');
                reject();
            }

            let total = !localQueue.length ? 0 : localQueue.length - 1;

            for await (const task of queue) {
                localQueue.push(task);
                total++;

                if (!!maxThreads && total >= maxThreads) {
                    break;
                }
            }

            !!localQueue.length ? next() : resolve(true);
        }

        addToLocalQueue();
    });
}