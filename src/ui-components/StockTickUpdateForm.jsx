/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import { Button, Flex, Grid, TextField } from "@aws-amplify/ui-react";
import { getOverrideProps } from "@aws-amplify/ui-react/internal";
import { StockTick } from "../models";
import { fetchByPath, validateField } from "./utils";
import { DataStore } from "aws-amplify";
export default function StockTickUpdateForm(props) {
  const {
    Id: IdProp,
    stockTick,
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
    stockId: "",
    LTP: "",
    tickTime: "",
  };
  const [Id, setId] = React.useState(initialValues.Id);
  const [stockId, setStockId] = React.useState(initialValues.stockId);
  const [LTP, setLTP] = React.useState(initialValues.LTP);
  const [tickTime, setTickTime] = React.useState(initialValues.tickTime);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = stockTickRecord
      ? { ...initialValues, ...stockTickRecord }
      : initialValues;
    setId(cleanValues.Id);
    setStockId(cleanValues.stockId);
    setLTP(cleanValues.LTP);
    setTickTime(cleanValues.tickTime);
    setErrors({});
  };
  const [stockTickRecord, setStockTickRecord] = React.useState(stockTick);
  React.useEffect(() => {
    const queryData = async () => {
      const record = IdProp
        ? await DataStore.query(StockTick, IdProp)
        : stockTick;
      setStockTickRecord(record);
    };
    queryData();
  }, [IdProp, stockTick]);
  React.useEffect(resetStateValues, [stockTickRecord]);
  const validations = {
    Id: [{ type: "Required" }],
    stockId: [{ type: "Required" }],
    LTP: [{ type: "Required" }],
    tickTime: [{ type: "Required" }],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value = getDisplayValue
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
      hour12: false,
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
          stockId,
          LTP,
          tickTime,
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
            if (typeof value === "string" && value.trim() === "") {
              modelFields[key] = undefined;
            }
          });
          await DataStore.save(
            StockTick.copyOf(stockTickRecord, (updated) => {
              Object.assign(updated, modelFields);
            })
          );
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            onError(modelFields, err.message);
          }
        }
      }}
      {...getOverrideProps(overrides, "StockTickUpdateForm")}
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
              stockId,
              LTP,
              tickTime,
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
        label="Stock id"
        isRequired={true}
        isReadOnly={false}
        value={stockId}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              Id,
              stockId: value,
              LTP,
              tickTime,
            };
            const result = onChange(modelFields);
            value = result?.stockId ?? value;
          }
          if (errors.stockId?.hasError) {
            runValidationTasks("stockId", value);
          }
          setStockId(value);
        }}
        onBlur={() => runValidationTasks("stockId", stockId)}
        errorMessage={errors.stockId?.errorMessage}
        hasError={errors.stockId?.hasError}
        {...getOverrideProps(overrides, "stockId")}
      ></TextField>
      <TextField
        label="Ltp"
        isRequired={true}
        isReadOnly={false}
        type="number"
        step="any"
        value={LTP}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              Id,
              stockId,
              LTP: value,
              tickTime,
            };
            const result = onChange(modelFields);
            value = result?.LTP ?? value;
          }
          if (errors.LTP?.hasError) {
            runValidationTasks("LTP", value);
          }
          setLTP(value);
        }}
        onBlur={() => runValidationTasks("LTP", LTP)}
        errorMessage={errors.LTP?.errorMessage}
        hasError={errors.LTP?.hasError}
        {...getOverrideProps(overrides, "LTP")}
      ></TextField>
      <TextField
        label="Tick time"
        isRequired={true}
        isReadOnly={false}
        type="datetime-local"
        value={tickTime && convertToLocal(new Date(tickTime))}
        onChange={(e) => {
          let value =
            e.target.value === "" ? "" : new Date(e.target.value).toISOString();
          if (onChange) {
            const modelFields = {
              Id,
              stockId,
              LTP,
              tickTime: value,
            };
            const result = onChange(modelFields);
            value = result?.tickTime ?? value;
          }
          if (errors.tickTime?.hasError) {
            runValidationTasks("tickTime", value);
          }
          setTickTime(value);
        }}
        onBlur={() => runValidationTasks("tickTime", tickTime)}
        errorMessage={errors.tickTime?.errorMessage}
        hasError={errors.tickTime?.hasError}
        {...getOverrideProps(overrides, "tickTime")}
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
          isDisabled={!(IdProp || stockTick)}
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
              !(IdProp || stockTick) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
