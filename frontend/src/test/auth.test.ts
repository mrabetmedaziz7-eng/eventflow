import { describe, it, expect } from "vitest";
import { validateLogin, validateRegister, validateProfile, validatePasswordChange } from "@/lib/validation";

describe("Phase 1 Authentication & Form Validation", () => {
  it("validates login credentials correctly", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "validation.required",
      password: "validation.required",
    });

    expect(validateLogin({ email: "invalid-email", password: "123" })).toEqual({
      email: "validation.email",
    });

    expect(validateLogin({ email: "test@example.com", password: "password123" })).toEqual({});
  });

  it("validates registration form fields", () => {
    const emptyForm = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "" as const,
    };
    const errors = validateRegister(emptyForm);
    expect(errors.firstName).toBe("validation.required");
    expect(errors.lastName).toBe("validation.required");
    expect(errors.email).toBe("validation.required");
    expect(errors.password).toBe("validation.required");
    expect(errors.role).toBe("validation.role");

    const mismatchForm = {
      firstName: "Salah",
      lastName: "Ben",
      email: "salah@example.com",
      password: "Password123!",
      confirmPassword: "WrongPassword!",
      role: "ENSEIGNANT" as const,
    };
    expect(validateRegister(mismatchForm)).toEqual({
      confirmPassword: "validation.passwordMatch",
    });

    const validForm = {
      ...mismatchForm,
      confirmPassword: "Password123!",
    };
    expect(validateRegister(validForm)).toEqual({});
  });

  it("validates profile updates", () => {
    expect(validateProfile({ firstName: "", lastName: "" })).toEqual({
      firstName: "validation.required",
      lastName: "validation.required",
    });
    expect(validateProfile({ firstName: "Salah", lastName: "Ben" })).toEqual({});
  });

  it("validates password changes", () => {
    expect(validatePasswordChange({ currentPassword: "", newPassword: "short", confirmPassword: "short" })).toEqual({
      currentPassword: "validation.required",
      newPassword: "validation.passwordLength",
    });

    expect(
      validatePasswordChange({
        currentPassword: "Password123!",
        newPassword: "NewPassword456!",
        confirmPassword: "MismatchPassword!",
      })
    ).toEqual({
      confirmPassword: "validation.passwordMatch",
    });

    expect(
      validatePasswordChange({
        currentPassword: "Password123!",
        newPassword: "NewPassword456!",
        confirmPassword: "NewPassword456!",
      })
    ).toEqual({});
  });
});

