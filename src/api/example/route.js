function handler({ name, email, age, action }) {
  if (action === "validate") {
    const errors = [];

    if (!name || name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long");
    }

    if (!email || !email.includes("@")) {
      errors.push("Valid email address is required");
    }

    if (age !== undefined && (age < 0 || age > 150)) {
      errors.push("Age must be between 0 and 150");
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors: errors,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      message: "All fields are valid",
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        age: age || null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  if (action === "greet") {
    const greeting = name ? `Hello, ${name}!` : "Hello there!";
    return {
      success: true,
      message: greeting,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: true,
    message: "Example API endpoint is working",
    availableActions: ["validate", "greet"],
    exampleUsage: {
      validate: {
        name: "John Doe",
        email: "john@example.com",
        age: 30,
        action: "validate",
      },
      greet: {
        name: "John",
        action: "greet",
      },
    },
    timestamp: new Date().toISOString(),
  };
}
export async function POST(request) {
  return handler(await request.json());
}