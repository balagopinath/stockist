import { Guid } from "../DataTypes/PrimitiveTypes";
import { IRepositoryModel } from "./IRepositoryModel";

export abstract class RepositoryModelBase implements IRepositoryModel
{
  private _id: Guid = "";

  public get Id(): Guid {
    return this._id;
  }

  public set Id(value: Guid) {
    this._id = value;
  }    
} 