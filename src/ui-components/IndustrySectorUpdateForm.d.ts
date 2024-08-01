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
export declare type IndustrySectorUpdateFormInputValues = {
    Id?: string;
    name?: string;
};
export declare type IndustrySectorUpdateFormValidationValues = {
    Id?: ValidationFunction<string>;
    name?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type IndustrySectorUpdateFormOverridesProps = {
    IndustrySectorUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    Id?: PrimitiveOverrideProps<TextFieldProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type IndustrySectorUpdateFormProps = React.PropsWithChildren<{
    overrides?: IndustrySectorUpdateFormOverridesProps | undefined | null;
} & {
    Id?: string;
    industrySector?: any;
    onSubmit?: (fields: IndustrySectorUpdateFormInputValues) => IndustrySectorUpdateFormInputValues;
    onSuccess?: (fields: IndustrySectorUpdateFormInputValues) => void;
    onError?: (fields: IndustrySectorUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: IndustrySectorUpdateFormInputValues) => IndustrySectorUpdateFormInputValues;
    onValidate?: IndustrySectorUpdateFormValidationValues;
} & React.CSSProperties>;
export default function IndustrySectorUpdateForm(props: IndustrySectorUpdateFormProps): React.ReactElement;
