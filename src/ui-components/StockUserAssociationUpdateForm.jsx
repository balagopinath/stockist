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
import { getStockUserAssociation } from "../graphql/queries";
import { updateStockUserAssociation } from "../graphql/mutations";
export default function StockUserAssociationUpdateForm(props) {
  const {
    Id: IdProp,
    stockUserAssociation: stockUserAssociationModelProp,
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
    userProfileId: "",
    openingStocks: "",
  };
  const [Id, setId] = React.useState(initialValues.Id);
  const [stockId, setStockId] = React.useState(initialValues.stockId);
  const [userProfileId, setUserProfileId] = React.useState(
    initialValues.userProfileId
  );
  const [openingStocks, setOpeningStocks] = React.useState(
    initialValues.openingStocks
  );
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = stockUserAssociationRecord
      ? { ...initialValues, ...stockUserAssociationRecord }
      : initialValues;
    setId(cleanValues.Id);
    setStockId(cleanValues.stockId);
    setUserProfileId(cleanValues.userProfileId);
    setOpeningStocks(cleanValues.openingStocks);
    setErrors({});
  };
  const [stockUserAssociationRecord, setStockUserAssociationRecord] =
    React.useState(stockUserAssociationModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = IdProp
        ? (
            await API.graphql({
              query: getStockUserAssociation.replaceAll("__typename", ""),
              variables: { Id: IdProp },
            })
          )?.data?.getStockUserAssociation
        : stockUserAssociationModelProp;
      setStockUserAssociationRecord(record);
    };
    queryData();
  }, [IdProp, stockUserAssociationModelProp]);
  React.useEffect(resetStateValues, [stockUserAssociationRecord]);
  const validations = {
    Id: [{ type: "Required" }],
    stockId: [{ type: "Required" }],
    userProfileId: [{ type: "Required" }],
    openingStocks: [{ type: "Required" }],
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
          stockId,
          userProfileId,
          openingStocks,
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
            query: updateStockUserAssociation.replaceAll("__typename", ""),
            variables: {
              input: {
                Id: stockUserAssociationRecord.Id,
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
      {...getOverrideProps(overrides, "StockUserAssociationUpdateForm")}
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
              userProfileId,
              openingStocks,
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
              userProfileId,
              openingStocks,
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
        label="User profile id"
        isRequired={true}
        isReadOnly={false}
        value={userProfileId}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              Id,
              stockId,
              userProfileId: value,
              openingStocks,
            };
            const result = onChange(modelFields);
            value = result?.userProfileId ?? value;
          }
          if (errors.userProfileId?.hasError) {
            runValidationTasks("userProfileId", value);
          }
          setUserProfileId(value);
        }}
        onBlur={() => runValidationTasks("userProfileId", userProfileId)}
        errorMessage={errors.userProfileId?.errorMessage}
        hasError={errors.userProfileId?.hasError}
        {...getOverrideProps(overrides, "userProfileId")}
      ></TextField>
      <TextField
        label="Opening stocks"
        isRequired={true}
        isReadOnly={false}
        type="number"
        step="any"
        value={openingStocks}
        onChange={(e) => {
          let value = isNaN(parseInt(e.target.value))
            ? e.target.value
            : parseInt(e.target.value);
          if (onChange) {
            const modelFields = {
              Id,
              stockId,
              userProfileId,
              openingStocks: value,
            };
            const result = onChange(modelFields);
            value = result?.openingStocks ?? value;
          }
          if (errors.openingStocks?.hasError) {
            runValidationTasks("openingStocks", value);
          }
          setOpeningStocks(value);
        }}
        onBlur={() => runValidationTasks("openingStocks", openingStocks)}
        errorMessage={errors.openingStocks?.errorMessage}
        hasError={errors.openingStocks?.hasError}
        {...getOverrideProps(overrides, "openingStocks")}
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
          isDisabled={!(IdProp || stockUserAssociationModelProp)}
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
              !(IdProp || stockUserAssociationModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
