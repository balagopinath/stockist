/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, SwitchFieldProps, TextFieldProps } from "@aws-amplify/ui-react";
import { EscapeHatchProps } from "@aws-amplify/ui-react/internal";
import { Trade } from "../models";
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type TradeUpdateFormInputValues = {
    Id?: string;
    stockUserId?: string;
    isBuy?: boolean;
    price?: number;
    tranDate?: string;
};
export declare type TradeUpdateFormValidationValues = {
    Id?: ValidationFunction<string>;
    stockUserId?: ValidationFunction<string>;
    isBuy?: ValidationFunction<boolean>;
    price?: ValidationFunction<number>;
    tranDate?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type TradeUpdateFormOverridesProps = {
    TradeUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    stockUserId?: PrimitiveOverrideProps<TextFieldProps>;
    isBuy?: PrimitiveOverrideProps<SwitchFieldProps>;
    price?: PrimitiveOverrideProps<TextFieldProps>;
    tranDate?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type TradeUpdateFormProps = React.PropsWithChildren<{
    overrides?: TradeUpdateFormOverridesProps | undefined | null;
} & {
    Id?: string;
    trade?: Trade;
    onSubmit?: (fields: TradeUpdateFormInputValues) => TradeUpdateFormInputValues;
    onSuccess?: (fields: TradeUpdateFormInputValues) => void;
    onError?: (fields: TradeUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: TradeUpdateFormInputValues) => TradeUpdateFormInputValues;
    onValidate?: TradeUpdateFormValidationValues;
} & React.CSSProperties>;
export default function TradeUpdateForm(props: TradeUpdateFormProps): React.ReactElement;
