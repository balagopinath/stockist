/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import {
  Button,
  Flex,
  Grid,
  SwitchField,
  TextField,
} from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { API } from "aws-amplify";
import { getTrade } from "../graphql/queries";
import { updateTrade } from "../graphql/mutations";
export default function TradeUpdateForm(props) {
  const {
    Id: IdProp,
    trade: tradeModelProp,
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
    stockUserId: "",
    isBuy: false,
    price: "",
    tranDate: "",
  };
  const [Id, setId] = React.useState(initialValues.Id);
  const [stockUserId, setStockUserId] = React.useState(
    initialValues.stockUserId
  );
  const [isBuy, setIsBuy] = React.useState(initialValues.isBuy);
  const [price, setPrice] = React.useState(initialValues.price);
  const [tranDate, setTranDate] = React.useState(initialValues.tranDate);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = tradeRecord
      ? { ...initialValues, ...tradeRecord }
      : initialValues;
    setId(cleanValues.Id);
    setStockUserId(cleanValues.stockUserId);
    setIsBuy(cleanValues.isBuy);
    setPrice(cleanValues.price);
    setTranDate(cleanValues.tranDate);
    setErrors({});
  };
  const [tradeRecord, setTradeRecord] = React.useState(tradeModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = IdProp
        ? (
            await API.graphql({
              query: getTrade.replaceAll("__typename", ""),
              variables: { Id: IdProp },
            })
          )?.data?.getTrade
        : tradeModelProp;
      setTradeRecord(record);
    };
    queryData();
  }, [IdProp, tradeModelProp]);
  React.useEffect(resetStateValues, [tradeRecord]);
  const validations = {
    Id: [{ type: "Required" }],
    stockUserId: [{ type: "Required" }],
    isBuy: [{ type: "Required" }],
    price: [{ type: "Required" }],
    tranDate: [{ type: "Required" }],
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
  const convertToLocal = (date) => {
    const df = new Intl.DateTimeFormat("default", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      calendar: "iso8601",
      numberingSystem: "latn",
      hourCycle: "h23",
    });
    const parts = df.formatToParts(date).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
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
          stockUserId,
          isBuy,
          price,
          tranDate,
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
            query: updateTrade.replaceAll("__typename", ""),
            variables: {
              input: {
                Id: tradeRecord.Id,
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
      {...getOverrideProps(overrides, "TradeUpdateForm")}
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
              stockUserId,
              isBuy,
              price,
              tranDate,
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
        label="Stock user id"
        isRequired={true}
        isReadOnly={false}
        value={stockUserId}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              Id,
              stockUserId: value,
              isBuy,
              price,
              tranDate,
            };
            const result = onChange(modelFields);
            value = result?.stockUserId ?? value;
          }
          if (errors.stockUserId?.hasError) {
            runValidationTasks("stockUserId", value);
          }
          setStockUserId(value);
        }}
        onBlur={() => runValidationTasks("stockUserId", stockUserId)}
        errorMessage={errors.stockUserId?.errorMessage}
        hasError={errors.stockUserId?.hasError}
        {...getOverrideProps(overrides, "stockUserId")}
      ></TextField>
      <SwitchField
        label="Is buy"
        defaultChecked={false}
        isDisabled={false}
        isChecked={isBuy}
        onChange={(e) => {
          let value = e.target.checked;
          if (onChange) {
            const modelFields = {
              Id,
              stockUserId,
              isBuy: value,
              price,
              tranDate,
            };
            const result = onChange(modelFields);
            value = result?.isBuy ?? value;
          }
          if (errors.isBuy?.hasError) {
            runValidationTasks("isBuy", value);
          }
          setIsBuy(value);
        }}
        onBlur={() => runValidationTasks("isBuy", isBuy)}
        errorMessage={errors.isBuy?.errorMessage}
        hasError={errors.isBuy?.hasError}
        {...getOverrideProps(overrides, "isBuy")}
      ></SwitchField>
      <TextField
        label="Price"
        isRequired={true}
        isReadOnly={false}
        type="number"
        step="any"
        value={price}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              Id,
              stockUserId,
              isBuy,
              price: value,
              tranDate,
            };
            const result = onChange(modelFields);
            value = result?.price ?? value;
          }
          if (errors.price?.hasError) {
            runValidationTasks("price", value);
          }
          setPrice(value);
        }}
        onBlur={() => runValidationTasks("price", price)}
        errorMessage={errors.price?.errorMessage}
        hasError={errors.price?.hasError}
        {...getOverrideProps(overrides, "price")}
      ></TextField>
      <TextField
        label="Tran date"
        isRequired={true}
        isReadOnly={false}
        type="datetime-local"
        value={tranDate && convertToLocal(new Date(tranDate))}
        onChange={(e) => {
          let value =
            e.target.value === "" ? "" : new Date(e.target.value).toISOString();
          if (onChange) {
            const modelFields = {
              Id,
              stockUserId,
              isBuy,
              price,
              tranDate: value,
            };
            const result = onChange(modelFields);
            value = result?.tranDate ?? value;
          }
          if (errors.tranDate?.hasError) {
            runValidationTasks("tranDate", value);
          }
          setTranDate(value);
        }}
        onBlur={() => runValidationTasks("tranDate", tranDate)}
        errorMessage={errors.tranDate?.errorMessage}
        hasError={errors.tranDate?.hasError}
        {...getOverrideProps(overrides, "tranDate")}
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
          isDisabled={!(IdProp || tradeModelProp)}
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
              !(IdProp || tradeModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
