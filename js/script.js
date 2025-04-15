$(document).ready(() => {
  // DOM elements
  const $display = $("#display")
  const $memoryIndicator = $("#memory-indicator")
  const $cursorPosition = $("#cursor-position")
  const $fractionDisplay = $("#fraction-display")

  // Calculator state
  let currentInput = "0"
  let cursorIndex = 1
  let memory = 0
  let isCalculated = false
  let taxRate = 5 // Default tax rate of 5%
  let grandTotal = 0
  const history = []
  let historyIndex = -1
  let isViewingHistory = false
  let isSettingTaxRate = false
  let lastOperation = null
  let lastValue = null
  let isFractionMode = false
  let fractionNumerator = null
  let fractionDenominator = null
  let displayScrollPosition = 0

  // Initialize display
  updateDisplay()

  // Helper functions
  function updateDisplay() {
    // Format with commas for thousands
    let displayValue = currentInput

    // Don't format if in special modes or if it's an error
    if (!isSettingTaxRate && !isFractionMode && displayValue !== "Error") {
      // Check if the input contains operators
      const hasOperators = /[+\-×÷^/()]/.test(displayValue)

      if (!hasOperators) {
        // Format the whole number with commas
        displayValue = formatNumberWithCommas(displayValue)
      } else {
        // Split by operators and format each number
        const operators = ["+", "-", "×", "÷", "^", "/", "(", ")"]
        let formattedParts = ""
        let currentNumber = ""

        for (let i = 0; i < displayValue.length; i++) {
          const char = displayValue[i]
          if (operators.includes(char)) {
            if (currentNumber) {
              formattedParts += formatNumberWithCommas(currentNumber)
              currentNumber = ""
            }
            formattedParts += char
          } else {
            currentNumber += char
          }
        }

        if (currentNumber) {
          formattedParts += formatNumberWithCommas(currentNumber)
        }

        displayValue = formattedParts
      }
    }

    // Hide fraction display by default
    $fractionDisplay.hide()

    // Special display for fraction mode
    if (isFractionMode) {
      $display.val("")
      $fractionDisplay.show()

      // Update the fraction display
      if (fractionNumerator === null) {
        $("#fraction-numerator").text("n")
      } else {
        $("#fraction-numerator").text(fractionNumerator)
      }

      if (fractionDenominator === null) {
        $("#fraction-denominator").text("d")
      } else {
        $("#fraction-denominator").text(fractionDenominator)
      }
    } else {
      $display.val(displayValue)
    }

    // Handle display scrolling for long inputs
    if (displayValue.length > 12) {
      // Calculate how much to scroll
      const visibleChars = 12
      const totalChars = displayValue.length

      // Ensure cursor is visible
      if (cursorIndex < displayScrollPosition) {
        displayScrollPosition = Math.max(0, cursorIndex - 2)
      } else if (cursorIndex > displayScrollPosition + visibleChars - 1) {
        displayScrollPosition = Math.min(totalChars - visibleChars, cursorIndex - visibleChars + 3)
      }

      // Apply scrolling by showing only a portion of the text
      const visibleText = displayValue.substring(displayScrollPosition, displayScrollPosition + visibleChars)
      $display.val(visibleText)
    } else {
      displayScrollPosition = 0
    }

    // Position cursor indicator
    if (cursorIndex > currentInput.length) {
      cursorIndex = currentInput.length
    }

    // Calculate cursor position based on character position
    const displayWidth = $display.width()
    const charWidth = 15 // Approximate character width
    const rightPadding = 10

    // Calculate position based on right-aligned text and scroll position
    const visibleCursorIndex = cursorIndex - displayScrollPosition
    const charsFromRight = Math.min(12, currentInput.length - displayScrollPosition) - visibleCursorIndex

    $cursorPosition.css({
      right: rightPadding + charsFromRight * charWidth + "px",
      display: isFractionMode ? "none" : "block",
    })
  }

  function formatNumberWithCommas(numStr) {
    // Don't format if it's not a valid number
    if (numStr === "" || isNaN(Number.parseFloat(numStr))) {
      return numStr
    }

    // Handle negative numbers
    const isNegative = numStr.startsWith("-")
    if (isNegative) {
      numStr = numStr.substring(1)
    }

    // Split by decimal point
    const parts = numStr.split(".")

    // Format the integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")

    // Reconstruct the number
    let result = parts.join(".")
    if (isNegative) {
      result = "-" + result
    }

    return result
  }

  function insertAtCursor(text) {
    if (isSettingTaxRate) {
      // When setting tax rate, only allow numbers and decimal
      if (!isNaN(text) || text === ".") {
        if (currentInput === "TAX RATE:" || currentInput === "TAX RATE: 0") {
          currentInput = "TAX RATE: " + text
        } else {
          currentInput += text
        }
        cursorIndex = currentInput.length
        updateDisplay()
      }
      return
    }

    if (isFractionMode) {
      // In fraction mode, only allow numbers
      if (!isNaN(text)) {
        if (fractionNumerator === null) {
          fractionNumerator = text
        } else if (fractionDenominator === null) {
          fractionDenominator = text
        } else {
          fractionDenominator += text
        }
        updateDisplay()
      }
      return
    }

    if (isCalculated) {
      currentInput = text
      cursorIndex = text.length
      isCalculated = false
    } else {
      if (currentInput === "0" && !isNaN(text) && text !== ".") {
        currentInput = text
        cursorIndex = 1
      } else {
        currentInput = currentInput.slice(0, cursorIndex) + text + currentInput.slice(cursorIndex)
        cursorIndex += text.length
      }
    }
    updateDisplay()
  }

  function clearAll() {
    if (isSettingTaxRate) {
      exitTaxRateMode()
      return
    }

    if (isFractionMode) {
      exitFractionMode()
      return
    }

    currentInput = "0"
    cursorIndex = 1
    isCalculated = false
    lastOperation = null
    lastValue = null
    history.length = 0
    historyIndex = -1
    isViewingHistory = false
    displayScrollPosition = 0
    updateDisplay()
  }

  function clearEntry() {
    if (isSettingTaxRate) {
      currentInput = "TAX RATE: 0"
      cursorIndex = currentInput.length
      updateDisplay()
      return
    }

    if (isFractionMode) {
      fractionNumerator = null
      fractionDenominator = null
      updateDisplay()
      return
    }

    if (isCalculated) {
      clearAll()
    } else {
      currentInput = "0"
      cursorIndex = 1
      displayScrollPosition = 0
      updateDisplay()
    }
  }

  function deleteAtCursor() {
    if (isSettingTaxRate) {
      if (currentInput.length > 10) {
        // "TAX RATE: " is 10 characters
        currentInput = currentInput.slice(0, -1)
        cursorIndex = currentInput.length
        updateDisplay()
      }
      return
    }

    if (isFractionMode) {
      if (fractionDenominator !== null && fractionDenominator.length > 0) {
        fractionDenominator = fractionDenominator.slice(0, -1)
        if (fractionDenominator === "") fractionDenominator = null
      } else if (fractionNumerator !== null && fractionNumerator.length > 0) {
        fractionNumerator = fractionNumerator.slice(0, -1)
        if (fractionNumerator === "") fractionNumerator = null
      }
      updateDisplay()
      return
    }

    if (cursorIndex > 0) {
      currentInput = currentInput.slice(0, cursorIndex - 1) + currentInput.slice(cursorIndex)
      cursorIndex--
      if (currentInput === "") {
        currentInput = "0"
        cursorIndex = 1
      }
      updateDisplay()
    }
  }

  function calculate() {
    if (isSettingTaxRate) {
      saveTaxRate()
      return
    }

    if (isFractionMode) {
      calculateFraction()
      return
    }

    try {
      // Replace mathematical symbols with JavaScript operators
      const expression = currentInput.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**")

      const result = eval(expression)

      if (isNaN(result) || !isFinite(result)) {
        currentInput = "Error"
      } else {
        // Format the result
        currentInput = Number.parseFloat(result.toFixed(10)).toString()
        // Remove trailing zeros
        if (currentInput.includes(".")) {
          currentInput = currentInput.replace(/\.?0+$/, "")
        }
      }

      cursorIndex = currentInput.length
      isCalculated = true
      displayScrollPosition = 0

      // Add to history
      history.push(currentInput)
      historyIndex = history.length

      updateDisplay()

      // Save for repeat operations
      lastValue = Number.parseFloat(currentInput)
    } catch (error) {
      currentInput = "Error"
      cursorIndex = currentInput.length
      updateDisplay()
    }
  }

  function repeatLastOperation() {
    if (lastOperation && lastValue !== null) {
      try {
        const currentValue = Number.parseFloat(currentInput)
        let result

        switch (lastOperation) {
          case "+":
            result = currentValue + lastValue
            break
          case "-":
            result = currentValue - lastValue
            break
          case "×":
            result = currentValue * lastValue
            break
          case "÷":
            result = currentValue / lastValue
            break
          case "^":
            result = Math.pow(currentValue, lastValue)
            break
        }

        if (isNaN(result) || !isFinite(result)) {
          currentInput = "Error"
        } else {
          currentInput = result.toString()
          if (currentInput.includes(".")) {
            currentInput = currentInput.replace(/\.?0+$/, "")
          }
        }

        cursorIndex = currentInput.length
        isCalculated = true
        displayScrollPosition = 0
        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        cursorIndex = currentInput.length
        updateDisplay()
      }
    }
  }

  // Tax rate modification functions
  function enterTaxRateMode() {
    isSettingTaxRate = true
    currentInput = "TAX RATE: " + taxRate
    cursorIndex = currentInput.length
    updateDisplay()
  }

  function exitTaxRateMode() {
    isSettingTaxRate = false
    currentInput = "0"
    cursorIndex = 1
    updateDisplay()
  }

  function saveTaxRate() {
    try {
      // Extract the number part from "TAX RATE: X.XX"
      const newRate = Number.parseFloat(currentInput.substring(10))
      if (!isNaN(newRate) && newRate >= 0) {
        taxRate = newRate
        // Show confirmation
        currentInput = "RATE SET: " + taxRate + "%"
        updateDisplay()

        // Return to normal mode after showing confirmation
        setTimeout(() => {
          exitTaxRateMode()
        }, 1500)
      } else {
        // Invalid input
        currentInput = "INVALID RATE"
        updateDisplay()
        setTimeout(() => {
          enterTaxRateMode()
        }, 1000)
      }
    } catch (error) {
      currentInput = "ERROR"
      updateDisplay()
      setTimeout(() => {
        exitTaxRateMode()
      }, 1000)
    }
  }

  // Fraction mode functions
  function enterFractionMode() {
    isFractionMode = true
    fractionNumerator = null
    fractionDenominator = null
    updateDisplay()
  }

  function exitFractionMode() {
    isFractionMode = false
    fractionNumerator = null
    fractionDenominator = null
    currentInput = "0"
    cursorIndex = 1
    updateDisplay()
  }

  function calculateFraction() {
    if (fractionNumerator !== null && fractionDenominator !== null) {
      try {
        const num = Number.parseFloat(fractionNumerator)
        const denom = Number.parseFloat(fractionDenominator)

        if (denom === 0) {
          currentInput = "Error"
        } else {
          const result = num / denom
          currentInput = result.toString()
          if (currentInput.includes(".")) {
            currentInput = currentInput.replace(/\.?0+$/, "")
          }
        }

        isFractionMode = false
        fractionNumerator = null
        fractionDenominator = null
        cursorIndex = currentInput.length
        isCalculated = true
        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        isFractionMode = false
        fractionNumerator = null
        fractionDenominator = null
        cursorIndex = currentInput.length
        updateDisplay()
      }
    }
  }

  // Button click handlers
  // Fix: Only select number buttons that are not double-zero
  $(".number:not(#double-zero)").on("click", function () {
    const value = $(this).text()
    insertAtCursor(value)
  })

  // Separate handler for double-zero
  $("#double-zero").on("click", () => {
    insertAtCursor("00")
  })

  $("#decimal").on("click", () => {
    if (isSettingTaxRate) {
      // Only add decimal if there isn't one already in the tax rate
      if (!currentInput.substring(10).includes(".")) {
        insertAtCursor(".")
      }
      return
    }

    if (isFractionMode) {
      return // No decimals in fraction mode
    }

    // Check if there's already a decimal in the current number segment
    const parts = currentInput.split(/[+\-×÷]/)
    const currentPart = parts[parts.length - 1]

    if (!currentPart.includes(".")) {
      insertAtCursor(".")
    }
  })

  $("#add, #subtract, #multiply, #divide").on("click", function () {
    if (isSettingTaxRate || isFractionMode) return

    const value = $(this).text()

    // If we just calculated a result, store the operation for repeat
    if (isCalculated) {
      lastOperation = value
      lastValue = Number.parseFloat(currentInput)
    }

    // Allow consecutive operators (like divide divide)
    insertAtCursor(value)

    // If equals was pressed twice, perform the operation again
    if ($(this).is("#equals") && isCalculated) {
      repeatLastOperation()
    }
  })

  $("#equals").on("click", () => {
    if (isCalculated) {
      repeatLastOperation()
    } else {
      calculate()
    }
  })

  $("#on-c").on("click", () => {
    clearAll()
  })

  $("#ce").on("click", () => {
    clearEntry()
  })

  $("#del").on("click", () => {
    deleteAtCursor()
  })

  $("#plus-minus").on("click", () => {
    if (isSettingTaxRate) {
      // Toggle negative tax rate if needed
      if (currentInput.substring(10, 11) === "-") {
        currentInput = "TAX RATE: " + currentInput.substring(11)
      } else {
        currentInput = "TAX RATE: -" + currentInput.substring(10)
      }
      cursorIndex = currentInput.length
      updateDisplay()
      return
    }

    if (isFractionMode) {
      if (fractionDenominator !== null) {
        fractionDenominator = (Number.parseFloat(fractionDenominator) * -1).toString()
      } else if (fractionNumerator !== null) {
        fractionNumerator = (Number.parseFloat(fractionNumerator) * -1).toString()
      }
      updateDisplay()
      return
    }

    if (currentInput !== "0") {
      if (currentInput.startsWith("-")) {
        currentInput = currentInput.substring(1)
        cursorIndex--
      } else {
        currentInput = "-" + currentInput
        cursorIndex++
      }
      updateDisplay()
    }
  })

  $("#percent").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      const value = Number.parseFloat(currentInput) / 100
      currentInput = value.toString()
      cursorIndex = currentInput.length
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  $("#square-root").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      const value = Math.sqrt(Number.parseFloat(currentInput))
      if (isNaN(value)) {
        currentInput = "Error"
      } else {
        currentInput = value.toString()
      }
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Exponent function
  $("#exponent").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return
    insertAtCursor("^")
  })

  // Fraction function
  $("#fraction").on("click", () => {
    if (isSettingTaxRate) return

    // If already in fraction mode, calculate the result
    if (isFractionMode) {
      calculateFraction()
      return
    }

    // If the display already shows a fraction with /, calculate it
    if (currentInput.includes("/")) {
      try {
        const parts = currentInput.split("/")
        if (parts.length === 2) {
          const decimal = Number.parseFloat(parts[0]) / Number.parseFloat(parts[1])
          currentInput = decimal.toString()
          cursorIndex = currentInput.length
          updateDisplay()
        }
      } catch (error) {
        currentInput = "Error"
        cursorIndex = currentInput.length
        updateDisplay()
      }
      return
    }

    // Enter fraction mode
    enterFractionMode()
  })

  // Memory functions
  $("#rm-cm").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    // Double click or long press would clear memory, but for now just toggle
    if (memory !== 0) {
      currentInput = memory.toString()
      cursorIndex = currentInput.length
      updateDisplay()
    } else {
      memory = 0
      $memoryIndicator.css("opacity", "0")
    }
  })

  $("#m-plus").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      memory += Number.parseFloat(currentInput)
      $memoryIndicator.css("opacity", "1")
      isCalculated = true
    } catch (error) {
      // Handle error
    }
  })

  $("#m-minus").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      memory -= Number.parseFloat(currentInput)
      $memoryIndicator.css("opacity", "1")
      isCalculated = true
    } catch (error) {
      // Handle error
    }
  })

  // Tax functions
  $("#tax").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      const value = Number.parseFloat(currentInput)
      const taxAmount = value * (taxRate / 100)
      currentInput = (value - taxAmount).toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  $("#tax-plus").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      const value = Number.parseFloat(currentInput)
      const taxAmount = value * (taxRate / 100)
      currentInput = (value + taxAmount).toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Grand Total function
  $("#gt").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      grandTotal += Number.parseFloat(currentInput)
      currentInput = grandTotal.toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Markup function
  $("#mu").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      const cost = Number.parseFloat(currentInput)
      // Assuming a standard 30% markup
      const markup = cost * 0.3
      currentInput = (cost + markup).toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Round Value function
  $("#rv").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    try {
      const value = Number.parseFloat(currentInput)
      currentInput = Math.round(value).toString()
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Left and right parentheses
  $("#left-paren, #right-paren").on("click", function () {
    if (!isSettingTaxRate && !isFractionMode) {
      insertAtCursor($(this).text())
    }
  })

  // Arrow key navigation
  $("#left-arrow").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    if (cursorIndex > 0) {
      cursorIndex--
      updateDisplay()
    }
  })

  $("#right-arrow").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return

    if (cursorIndex < currentInput.length) {
      cursorIndex++
      updateDisplay()
    }
  })

  $("#up-arrow").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return
    if (history.length === 0) return

    if (historyIndex > 0) {
      historyIndex--
    } else {
      historyIndex = 0
    }

    currentInput = history[historyIndex]
    cursorIndex = currentInput.length
    isViewingHistory = true
    updateDisplay()
  })

  $("#down-arrow").on("click", () => {
    if (isSettingTaxRate || isFractionMode) return
    if (history.length === 0) return

    if (historyIndex < history.length - 1) {
      historyIndex++
      currentInput = history[historyIndex]
    } else {
      // If at the end of history, return to current input
      currentInput = "0"
      isViewingHistory = false
    }

    cursorIndex = currentInput.length
    updateDisplay()
  })

  // Tax Rate Modification - Button Combination
  // Hold TAX- and press % to enter tax rate modification mode
  let taxButtonPressed = false
  let taxButtonTimer = null

  $("#tax").on("mousedown touchstart", () => {
    taxButtonPressed = true
    taxButtonTimer = setTimeout(() => {
      if (taxButtonPressed) {
        enterTaxRateMode()
        taxButtonPressed = false
      }
    }, 1000) // Long press for 1 second
  })

  $("#tax").on("mouseup mouseleave touchend", () => {
    if (taxButtonTimer) {
      clearTimeout(taxButtonTimer)
    }
    taxButtonPressed = false
  })

  // Show cursor position
  $display.on("focus", () => {
    $cursorPosition.show()
  })

  // Initial focus
  setTimeout(() => {
    $cursorPosition.show()
  }, 1000)
})
