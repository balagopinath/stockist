/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
import { EscapeHatchProps } from "@aws-amplify/ui-react/internal";
import { StockTick } from "../models";
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type StockTickUpdateFormInputValues = {
    Id?: string;
    stockId?: string;
    LTP?: number;
    tickTime?: string;
};
export declare type StockTickUpdateFormValidationValues = {
    Id?: ValidationFunction<string>;
    stockId?: ValidationFunction<string>;
    LTP?: ValidationFunction<number>;
    tickTime?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type StockTickUpdateFormOverridesProps = {
    StockTickUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    stockId?: PrimitiveOverrideProps<TextFieldProps>;
    LTP?: PrimitiveOverrideProps<TextFieldProps>;
    tickTime?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type StockTickUpdateFormProps = React.PropsWithChildren<{
    overrides?: StockTickUpdateFormOverridesProps | undefined | null;
} & {
    Id?: string;
    stockTick?: StockTick;
    onSubmit?: (fields: StockTickUpdateFormInputValues) => StockTickUpdateFormInputValues;
    onSuccess?: (fields: StockTickUpdateFormInputValues) => void;
    onError?: (fields: StockTickUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: StockTickUpdateFormInputValues) => StockTickUpdateFormInputValues;
    onValidate?: StockTickUpdateFormValidationValues;
} & React.CSSProperties>;
export default function StockTickUpdateForm(props: StockTickUpdateFormProps): React.ReactElement;
