/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type IndustryUpdateFormInputValues = {
    Id?: string;
    name?: string;
};
export declare type IndustryUpdateFormValidationValues = {
    Id?: ValidationFunction<string>;
    name?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type IndustryUpdateFormOverridesProps = {
    IndustryUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type IndustryUpdateFormProps = React.PropsWithChildren<{
    overrides?: IndustryUpdateFormOverridesProps | undefined | null;
} & {
    Id?: string;
    industry?: any;
    onSubmit?: (fields: IndustryUpdateFormInputValues) => IndustryUpdateFormInputValues;
    onSuccess?: (fields: IndustryUpdateFormInputValues) => void;
    onError?: (fields: IndustryUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: IndustryUpdateFormInputValues) => IndustryUpdateFormInputValues;
    onValidate?: IndustryUpdateFormValidationValues;
} & React.CSSProperties>;
export default function IndustryUpdateForm(props: IndustryUpdateFormProps): React.ReactElement;
