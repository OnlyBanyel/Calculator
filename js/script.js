$(document).ready(() => {
  // DOM elements
  const $display = $("#inputBar");
  const $memoryIndicator = $("#memory-indicator");
  const $historyIndicator = $("#history-indicator");
  const $cursorPosition = $("#cursor-position");
  const $calcuBody = $(".calcu-body");

  // Calculator state
  let currentInput = "0";
  let cursorIndex = 1;
  let memory = 0;
  let isCalculated = false;
  const history = [];
  let historyIndex = -1;
  let isOn = true;
  let longPressTimer = null;
  let isViewingHistory = false;

  // Initialize display
  updateDisplay();

  // Helper functions
  function updateDisplay() {
    $display.val(currentInput);

    // Position cursor indicator
    if (cursorIndex > currentInput.length) {
      cursorIndex = currentInput.length;
    }

    // Calculate cursor position based on character position
    const displayWidth = $display.width();
    const textWidth = currentInput.length * 20; // Approximate character width
    const rightPadding = 15;

    // Calculate position based on right-aligned text
    const totalWidth = displayWidth - rightPadding;
    const charsFromRight = currentInput.length - cursorIndex;
    const position = totalWidth - charsFromRight * 20;

    $cursorPosition.css({
      right: rightPadding + charsFromRight * 20 + "px",
      display: "block",
    });
  }

  function insertAtCursor(text) {
    if (!isOn) return;

    isViewingHistory = false;
    $historyIndicator.css("opacity", "0");

    if (isCalculated) {
      currentInput = text;
      cursorIndex = text.length;
      isCalculated = false;
    } else {
      if (currentInput === "0" && !isNaN(text) && text !== ".") {
        currentInput = text;
        cursorIndex = 1;
      } else {
        currentInput =
          currentInput.slice(0, cursorIndex) +
          text +
          currentInput.slice(cursorIndex);
        cursorIndex += text.length;
      }
    }
    updateDisplay();
  }

  function deleteAtCursor() {
    if (!isOn) return;

    isViewingHistory = false;
    $historyIndicator.css("opacity", "0");

    if (cursorIndex > 0) {
      currentInput =
        currentInput.slice(0, cursorIndex - 1) +
        currentInput.slice(cursorIndex);
      cursorIndex--;
      if (currentInput === "") {
        currentInput = "0";
        cursorIndex = 1;
      }
      updateDisplay();
    }
  }

  function clearAll() {
    if (!isOn) return;

    currentInput = "0";
    cursorIndex = 1;
    isCalculated = false;
    history.length = 0; // Clear history
    historyIndex = -1;
    isViewingHistory = false;
    $historyIndicator.css("opacity", "0");
    updateDisplay();
  }

  function clearEntry() {
    if (!isOn) return;

    isViewingHistory = false;
    $historyIndicator.css("opacity", "0");

    if (isCalculated) {
      clearAll();
    } else {
      currentInput = "0";
      cursorIndex = 1;
      updateDisplay();
    }
  }

  function turnOff() {
    isOn = false;
    currentInput = "";
    $display.val("");
    $memoryIndicator.css("opacity", "0");
    $historyIndicator.css("opacity", "0");
    $cursorPosition.hide();
  }

  function turnOn() {
    isOn = true;
    currentInput = "0";
    cursorIndex = 1;
    isCalculated = false;
    updateDisplay();
  }

  function calculate() {
    if (!isOn) return;

    try {
      // Replace mathematical symbols with JavaScript operators
      let expression = currentInput
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, "Math.PI")
        .replace(/e/g, "Math.E")
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(")
        .replace(/√\(/g, "Math.sqrt(")
        .replace(/√(\d+)/g, "Math.sqrt($1)")
        .replace(/(\d+)\^(\d+)/g, "Math.pow($1, $2)");

      // Handle factorial
      while (expression.includes("!")) {
        const factRegex = /(\d+)!/;
        const match = expression.match(factRegex);
        if (match) {
          const num = Number.parseInt(match[1]);
          let factorial = 1;
          for (let i = 2; i <= num; i++) {
            factorial *= i;
          }
          expression = expression.replace(match[0], factorial);
        } else {
          break;
        }
      }

      const result = eval(expression);

      if (isNaN(result) || !isFinite(result)) {
        currentInput = "Error";
      } else {
        // Format the result
        currentInput = Number.parseFloat(result.toFixed(10)).toString();
        // Remove trailing zeros
        if (currentInput.includes(".")) {
          currentInput = currentInput.replace(/\.?0+$/, "");
        }
      }

      cursorIndex = currentInput.length;
      isCalculated = true;

      // Add to history
      history.push(currentInput);
      historyIndex = history.length;

      isViewingHistory = false;
      $historyIndicator.css("opacity", "0");

      updateDisplay();
    } catch (error) {
      currentInput = "Error";
      cursorIndex = currentInput.length;
      updateDisplay();
    }
  }

  // Button click handlers
  $(".number").on("click", function () {
    const value = $(this).text();
    insertAtCursor(value);
  });

  $("#double-zero").on("click", () => {
    insertAtCursor("00");
  });

  $(
    "#add, #subtract, #multiply, #divide, #open-parenthesis, #close-parenthesis, #power"
  ).on("click", function () {
    const value = $(this).text();
    insertAtCursor(value);
  });

  $("#equals").on("click", () => {
    calculate();
  });

  // ON/CA button with long press to turn off
  $("#clear-all").on("mousedown touchstart", () => {
    if (!isOn) {
      turnOn();
      return;
    }

    longPressTimer = setTimeout(() => {
      turnOff();
      longPressTimer = null;
    }, 1500); // 1.5 seconds for long press
  });

  $("#clear-all").on("mouseup touchend", () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      clearAll(); // Regular press behavior
    }
  });

  $("#clear").on("click", () => {
    clearEntry();
  });

  $("#delete").on("click", () => {
    deleteAtCursor();
  });

  $("#left-arrow").on("click", () => {
    if (!isOn) return;

    if (isViewingHistory) {
      isViewingHistory = false;
      $historyIndicator.css("opacity", "0");
    }

    if (cursorIndex > 0) {
      cursorIndex--;
      updateDisplay();
    }
  });

  $("#right-arrow").on("click", () => {
    if (!isOn) return;

    if (isViewingHistory) {
      isViewingHistory = false;
      $historyIndicator.css("opacity", "0");
    }

    if (cursorIndex < currentInput.length) {
      cursorIndex++;
      updateDisplay();
    }
  });

  $("#up-arrow").on("click", () => {
    if (!isOn || history.length === 0) return;

    if (historyIndex > 0) {
      historyIndex--;
      currentInput = history[historyIndex];
      cursorIndex = currentInput.length;
      isViewingHistory = true;
      $historyIndicator.css("opacity", "1");
      updateDisplay();
    }
  });

  $("#down-arrow").on("click", () => {
    if (!isOn || history.length === 0) return;

    if (historyIndex < history.length - 1) {
      historyIndex++;
      currentInput = history[historyIndex];
      cursorIndex = currentInput.length;
      isViewingHistory = true;
      $historyIndicator.css("opacity", "1");
      updateDisplay();
    } else {
      // If we're at the end of history, return to current input
      isViewingHistory = false;
      $historyIndicator.css("opacity", "0");
      currentInput = "0";
      cursorIndex = 1;
      updateDisplay();
    }
  });

  $("#plus-minus").on("click", () => {
    if (!isOn) return;

    if (currentInput !== "0") {
      if (currentInput.startsWith("-")) {
        currentInput = currentInput.substring(1);
        cursorIndex--;
      } else {
        currentInput = "-" + currentInput;
        cursorIndex++;
      }
      updateDisplay();
    }
  });

  $("#square-root").on("click", () => {
    if (!isOn) return;
    insertAtCursor("√(");
  });

  $("#percent").on("click", () => {
    if (!isOn) return;

    try {
      const value = Number.parseFloat(currentInput) / 100;
      currentInput = value.toString();
      cursorIndex = currentInput.length;
      updateDisplay();
    } catch (error) {
      currentInput = "Error";
      updateDisplay();
    }
  });

  $("#pi").on("click", () => {
    if (!isOn) return;
    insertAtCursor("π");
  });

  $("#e").on("click", () => {
    if (!isOn) return;
    insertAtCursor("e");
  });

  $("#sin, #cos, #tan, #log, #ln").on("click", function () {
    if (!isOn) return;
    const func = $(this).text();
    insertAtCursor(func + "(");
  });

  $("#factorial").on("click", () => {
    if (!isOn) return;
    insertAtCursor("!");
  });

  $("#fraction").on("click", () => {
    if (!isOn) return;

    // If the display already shows a fraction, calculate it
    if (currentInput.includes("/")) {
      try {
        const parts = currentInput.split("/");
        if (parts.length === 2) {
          const decimal =
            Number.parseFloat(parts[0]) / Number.parseFloat(parts[1]);
          currentInput = decimal.toString();
          cursorIndex = currentInput.length;
          updateDisplay();
        }
      } catch (error) {
        currentInput = "Error";
        cursorIndex = currentInput.length;
        updateDisplay();
      }
      return;
    }

    // If we're in the middle of entering a number, add a fraction separator
    if (currentInput !== "0" && !isCalculated) {
      insertAtCursor("/");
      return;
    }

    // If we have a calculated result, convert to fraction
    if (isCalculated) {
      try {
        const value = Number.parseFloat(currentInput);

        // Convert decimal to fraction
        const decimalToFraction = (decimal) => {
          if (decimal === Number.parseInt(decimal)) {
            return { numerator: decimal, denominator: 1 };
          }

          // Convert to string and count decimal places
          const decimalStr = decimal.toString();
          const decimalPlaces = decimalStr.includes(".")
            ? decimalStr.split(".")[1].length
            : 0;

          // Convert to fraction with denominator based on decimal places
          let denominator = Math.pow(10, decimalPlaces);
          let numerator = decimal * denominator;

          // Find greatest common divisor
          const findGCD = (a, b) => {
            return b ? findGCD(b, a % b) : a;
          };

          const gcd = findGCD(numerator, denominator);

          // Simplify the fraction
          numerator = numerator / gcd;
          denominator = denominator / gcd;

          return {
            numerator: Math.round(numerator),
            denominator: Math.round(denominator),
          };
        };

        const fraction = decimalToFraction(value);
        currentInput = `${fraction.numerator}/${fraction.denominator}`;
        cursorIndex = currentInput.length;
        updateDisplay();
      } catch (error) {
        currentInput = "Error";
        cursorIndex = currentInput.length;
        updateDisplay();
      }
    }
  });

  // Memory functions
  $("#memory-recall").on("click", () => {
    if (!isOn) return;
    currentInput = memory.toString();
    cursorIndex = currentInput.length;
    updateDisplay();
  });

  $("#memory-clear").on("click", () => {
    if (!isOn) return;
    memory = 0;
    $memoryIndicator.css("opacity", "0");
  });

  $("#memory-plus").on("click", () => {
    if (!isOn) return;
    try {
      memory += Number.parseFloat(currentInput);
      $memoryIndicator.css("opacity", "1");
    } catch (error) {
      // Handle error
    }
  });

  $("#memory-minus").on("click", () => {
    if (!isOn) return;
    try {
      memory -= Number.parseFloat(currentInput);
      $memoryIndicator.css("opacity", "1");
    } catch (error) {
      // Handle error
    }
  });

  // Keyboard support
  $(document).on("keydown", (e) => {
    if (!isOn) {
      if (e.key === "Escape") {
        turnOn();
      }
      e.preventDefault();
      return;
    }

    e.preventDefault();

    // Numbers
    if ((e.key >= "0" && e.key <= "9") || e.key === ".") {
      insertAtCursor(e.key);
    }

    // Operators
    switch (e.key) {
      case "+":
        insertAtCursor("+");
        break;
      case "-":
        insertAtCursor("-");
        break;
      case "*":
        insertAtCursor("×");
        break;
      case "/":
        insertAtCursor("÷");
        break;
      case "(":
        insertAtCursor("(");
        break;
      case ")":
        insertAtCursor(")");
        break;
      case "^":
        insertAtCursor("^");
        break;
      case "Enter":
        calculate();
        break;
      case "Backspace":
        deleteAtCursor();
        break;
      case "Escape":
        clearAll();
        break;
      case "ArrowLeft":
        if (cursorIndex > 0) {
          cursorIndex--;
          if (isViewingHistory) {
            isViewingHistory = false;
            $historyIndicator.css("opacity", "0");
          }
          updateDisplay();
        }
        break;
      case "ArrowRight":
        if (cursorIndex < currentInput.length) {
          cursorIndex++;
          if (isViewingHistory) {
            isViewingHistory = false;
            $historyIndicator.css("opacity", "0");
          }
          updateDisplay();
        }
        break;
      case "ArrowUp":
        if (historyIndex > 0) {
          historyIndex--;
          currentInput = history[historyIndex];
          cursorIndex = currentInput.length;
          isViewingHistory = true;
          $historyIndicator.css("opacity", "1");
          updateDisplay();
        }
        break;
      case "ArrowDown":
        if (historyIndex < history.length - 1) {
          historyIndex++;
          currentInput = history[historyIndex];
          cursorIndex = currentInput.length;
          isViewingHistory = true;
          $historyIndicator.css("opacity", "1");
          updateDisplay();
        }
        break;
    }
  });

  // Show cursor position on focus
  $display.on("focus", () => {
    $cursorPosition.show();
  });

  // Initial focus
  setTimeout(() => {
    $cursorPosition.show();
  }, 1000);
});
