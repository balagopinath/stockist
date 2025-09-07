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
import { getCompany } from "../graphql/queries";
import { updateCompany } from "../graphql/mutations";
export default function CompanyUpdateForm(props) {
  const {
    Id: IdProp,
    company: companyModelProp,
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
    name: "",
    ISIN: "",
    MarketCap: "",
  };
  const [Id, setId] = React.useState(initialValues.Id);
  const [name, setName] = React.useState(initialValues.name);
  const [ISIN, setISIN] = React.useState(initialValues.ISIN);
  const [MarketCap, setMarketCap] = React.useState(initialValues.MarketCap);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = companyRecord
      ? { ...initialValues, ...companyRecord }
      : initialValues;
    setId(cleanValues.Id);
    setName(cleanValues.name);
    setISIN(cleanValues.ISIN);
    setMarketCap(cleanValues.MarketCap);
    setErrors({});
  };
  const [companyRecord, setCompanyRecord] = React.useState(companyModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = IdProp
        ? (
            await API.graphql({
              query: getCompany.replaceAll("__typename", ""),
              variables: { Id: IdProp },
            })
          )?.data?.getCompany
        : companyModelProp;
      setCompanyRecord(record);
    };
    queryData();
  }, [IdProp, companyModelProp]);
  React.useEffect(resetStateValues, [companyRecord]);
  const validations = {
    Id: [{ type: "Required" }],
    name: [{ type: "Required" }],
    ISIN: [{ type: "Required" }],
    MarketCap: [],
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
          name,
          ISIN,
          MarketCap: MarketCap ?? null,
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
            query: updateCompany.replaceAll("__typename", ""),
            variables: {
              input: {
                Id: companyRecord.Id,
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
      {...getOverrideProps(overrides, "CompanyUpdateForm")}
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
              name,
              ISIN,
              MarketCap,
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
        label="Name"
        isRequired={true}
        isReadOnly={false}
        value={name}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              Id,
              name: value,
              ISIN,
              MarketCap,
            };
            const result = onChange(modelFields);
            value = result?.name ?? value;
          }
          if (errors.name?.hasError) {
            runValidationTasks("name", value);
          }
          setName(value);
        }}
        onBlur={() => runValidationTasks("name", name)}
        errorMessage={errors.name?.errorMessage}
        hasError={errors.name?.hasError}
        {...getOverrideProps(overrides, "name")}
      ></TextField>
      <TextField
        label="Isin"
        isRequired={true}
        isReadOnly={false}
        value={ISIN}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              Id,
              name,
              ISIN: value,
              MarketCap,
            };
            const result = onChange(modelFields);
            value = result?.ISIN ?? value;
          }
          if (errors.ISIN?.hasError) {
            runValidationTasks("ISIN", value);
          }
          setISIN(value);
        }}
        onBlur={() => runValidationTasks("ISIN", ISIN)}
        errorMessage={errors.ISIN?.errorMessage}
        hasError={errors.ISIN?.hasError}
        {...getOverrideProps(overrides, "ISIN")}
      ></TextField>
      <TextField
        label="Market cap"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={MarketCap}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              Id,
              name,
              ISIN,
              MarketCap: value,
            };
            const result = onChange(modelFields);
            value = result?.MarketCap ?? value;
          }
          if (errors.MarketCap?.hasError) {
            runValidationTasks("MarketCap", value);
          }
          setMarketCap(value);
        }}
        onBlur={() => runValidationTasks("MarketCap", MarketCap)}
        errorMessage={errors.MarketCap?.errorMessage}
        hasError={errors.MarketCap?.hasError}
        {...getOverrideProps(overrides, "MarketCap")}
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
          isDisabled={!(IdProp || companyModelProp)}
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
              !(IdProp || companyModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
