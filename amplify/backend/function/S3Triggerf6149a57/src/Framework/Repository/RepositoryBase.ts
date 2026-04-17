import { IRepository } from "./IRepository.js";
import { IRepositoryModel } from "./IRepositoryModel";
import { RepositoryModelBase } from "./RepositoryModelBase.js";

export abstract class RepositoryBase<T extends RepositoryModelBase> implements IRepository<T> 
{
    abstract getAll(): Promise<T[]>;
    abstract getById(id: string): Promise<T | null> ;
    abstract create(entity: T): Promise<T> ;
    abstract update(id: string, entity: Partial<T>): Promise<T | null>;
    abstract delete(id: string): Promise<boolean> 
}