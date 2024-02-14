/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import { Button, Flex, Grid, TextField } from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { API } from "aws-amplify";
import { getStock } from "../graphql/queries";
import { updateStock } from "../graphql/mutations";
export default function StockUpdateForm(props) {
  const {
    Id: IdProp,
    stock: stockModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    Id: "",
    Stock: "",
    code: "",
  };
  const [Id, setId] = React.useState(initialValues.Id);
  const [stock, setStock] = React.useState(initialValues.Stock);
  const [code, setCode] = React.useState(initialValues.code);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = stockRecord
      ? { ...initialValues, ...stockRecord }
      : initialValues;
    setId(cleanValues.Id);
    setStock(cleanValues.Stock);
    setCode(cleanValues.code);
    setErrors({});
  };
  const [stockRecord, setStockRecord] = React.useState(stockModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = IdProp
        ? (
            await API.graphql({
              query: getStock.replaceAll("__typename", ""),
              variables: { Id: IdProp },
            })
          )?.data?.getStock
        : stockModelProp;
      setStockRecord(record);
    };
    queryData();
  }, [IdProp, stockModelProp]);
  React.useEffect(resetStateValues, [stockRecord]);
  const validations = {
    Id: [{ type: "Required" }],
    Stock: [{ type: "Required" }],
    code: [{ type: "Required" }],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          Id,
          Stock: stock,
          code,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await API.graphql({
            query: updateStock.replaceAll("__typename", ""),
            variables: {
              input: {
                Id: stockRecord.Id,
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "StockUpdateForm")}
      {...rest}
    >
      <TextField
        label="Id"
        isRequired={true}
        isReadOnly={true}
        value={Id}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              Id: value,
              Stock: stock,
              code,
            };
            const result = onChange(modelFields);
            value = result?.Id ?? value;
          }
          if (errors.Id?.hasError) {
            runValidationTasks("Id", value);
          }
          setId(value);
        }}
        onBlur={() => runValidationTasks("Id", Id)}
        errorMessage={errors.Id?.errorMessage}
        hasError={errors.Id?.hasError}
        {...getOverrideProps(overrides, "Id")}
      ></TextField>
      <TextField
        label="Stock"
        isRequired={true}
        isReadOnly={false}
        value={stock}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              Id,
              Stock: value,
              code,
            };
            const result = onChange(modelFields);
            value = result?.Stock ?? value;
          }
          if (errors.Stock?.hasError) {
            runValidationTasks("Stock", value);
          }
          setStock(value);
        }}
        onBlur={() => runValidationTasks("Stock", stock)}
        errorMessage={errors.Stock?.errorMessage}
        hasError={errors.Stock?.hasError}
        {...getOverrideProps(overrides, "Stock")}
      ></TextField>
      <TextField
        label="Code"
        isRequired={true}
        isReadOnly={false}
        value={code}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              Id,
              Stock: stock,
              code: value,
            };
            const result = onChange(modelFields);
            value = result?.code ?? value;
          }
          if (errors.code?.hasError) {
            runValidationTasks("code", value);
          }
          setCode(value);
        }}
        onBlur={() => runValidationTasks("code", code)}
        errorMessage={errors.code?.errorMessage}
        hasError={errors.code?.hasError}
        {...getOverrideProps(overrides, "code")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(IdProp || stockModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(IdProp || stockModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
