$(document).ready(() => {
  // DOM elements
  const $display = $("#display")
  const $memoryIndicator = $("#memory-indicator")
  const $cursorPosition = $("#cursor-position")
  const $muIndicator = $("#mu-indicator")

  // Calculator state
  let currentInput = "0"
  let cursorIndex = 1
  let memory = 0
  let isCalculated = false
  let taxRate = 5 // Default tax rate of 5%
  let grandTotal = 0
  const history = [] // Will store objects with {equation, result}
  let historyIndex = -1
  let isViewingHistory = false
  let isSettingTaxRate = false
  let lastOperation = null
  let lastValue = null
  let displayScrollPosition = 0
  let isMuMode = false // Ensure this is false by default
  let muBaseValue = null
  let currentEquation = "" // Track the current equation being built

  // Initialize display and indicators
  $muIndicator.css("opacity", "0") // Explicitly hide MU indicator on initialization
  $memoryIndicator.css("opacity", "0") // Hide memory indicator initially
  updateDisplay()

  // Helper functions
  function updateDisplay() {
    // Format with commas for thousands
    let displayValue = currentInput

    // Don't format if in special modes or if it's an error
    if (!isSettingTaxRate && displayValue !== "Error") {
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
      $display.val(displayValue)
    }

    // Update MU indicator - ensure it's only visible when in MU mode
    if (isMuMode) {
      $muIndicator.css("opacity", "1")
    } else {
      $muIndicator.css("opacity", "0")
    }

    // Update memory indicator
    if (memory !== 0) {
      $memoryIndicator.css("opacity", "1")
    } else {
      $memoryIndicator.css("opacity", "0")
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
      display: "block",
    })
  }

  // Helper function to format numbers with commas
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

    if (isMuMode) {
      // In MU mode, only allow numbers and decimal
      if (!isNaN(text) || text === ".") {
        if (currentInput === "0") {
          currentInput = text
        } else {
          currentInput += text
        }
        cursorIndex = currentInput.length
        updateDisplay()
      }
      return
    }

    if (isViewingHistory) {
      // Exit history view if entering new input
      isViewingHistory = false
      if (!isNaN(text) || text === ".") {
        currentInput = text
        currentEquation = text // Start a new equation
        cursorIndex = 1
      } else {
        // For operators, keep the current value and add the operator
        currentInput += text
        currentEquation = currentInput // Update the equation
        cursorIndex = currentInput.length
      }
    } else if (isCalculated) {
      // If we just calculated a result and enter a number, start fresh
      if (!isNaN(text) || text === ".") {
        currentInput = text
        currentEquation = text // Start a new equation
        cursorIndex = 1
      } else {
        // For operators, keep the current value and add the operator
        currentInput += text
        currentEquation = currentInput // Update the equation
        cursorIndex = currentInput.length
      }
      isCalculated = false
    } else {
      if (currentInput === "0" && !isNaN(text) && text !== ".") {
        currentInput = text
        currentEquation = text // Start a new equation
        cursorIndex = 1
      } else {
        currentInput = currentInput.slice(0, cursorIndex) + text + currentInput.slice(cursorIndex)
        currentEquation = currentInput // Update the equation
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

    if (isMuMode) {
      exitMuMode()
      return
    }

    currentInput = "0"
    currentEquation = ""
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

    if (isMuMode) {
      currentInput = "0"
      cursorIndex = 1
      updateDisplay()
      return
    }

    if (isViewingHistory) {
      isViewingHistory = false
    }

    if (isCalculated) {
      clearAll()
    } else {
      currentInput = "0"
      currentEquation = ""
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

    if (isMuMode) {
      if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1)
        if (currentInput === "") {
          currentInput = "0"
        }
        cursorIndex = currentInput.length
        updateDisplay()
      } else {
        currentInput = "0"
        cursorIndex = 1
        updateDisplay()
      }
      return
    }

    if (isViewingHistory) {
      isViewingHistory = false
      currentInput = "0"
      currentEquation = ""
      cursorIndex = 1
      updateDisplay()
      return
    }

    if (cursorIndex > 0) {
      currentInput = currentInput.slice(0, cursorIndex - 1) + currentInput.slice(cursorIndex)
      currentEquation = currentInput // Update the equation
      cursorIndex--
      if (currentInput === "") {
        currentInput = "0"
        currentEquation = ""
        cursorIndex = 1
      }
      updateDisplay()
    }
  }

  // Replace the calculate function with this sequential calculation function
  function calculate() {
    if (isSettingTaxRate) {
      saveTaxRate()
      return
    }

    if (isMuMode) {
      calculateMarkup()
      return
    }

    if (isViewingHistory) {
      isViewingHistory = false
    }

    try {
      // Save the equation before calculating
      const equation = currentInput

      // Sequential calculation without PEMDAS
      // Split the input by operators while keeping the operators
      const tokens = currentInput.split(/([+\-×÷^/])/).filter((token) => token !== "")

      // Process the tokens sequentially
      let result = Number.parseFloat(tokens[0])
      const intermediateResults = [result]
      const intermediateEquations = [tokens[0]]

      for (let i = 1; i < tokens.length; i += 2) {
        const operator = tokens[i]
        const operand = Number.parseFloat(tokens[i + 1])

        // Perform the operation
        switch (operator) {
          case "+":
            result += operand
            break
          case "-":
            result -= operand
            break
          case "×":
            result *= operand
            break
          case "÷":
            result /= operand
            break
          case "^":
            result = Math.pow(result, operand)
            break
          case "/":
            result /= operand
            break
        }

        // Save intermediate result and equation
        intermediateResults.push(result)
        intermediateEquations.push(intermediateEquations[intermediateEquations.length - 1] + operator + tokens[i + 1])
      }

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

      // Add to history - store equation, result, and intermediate results
      history.push({
        equation: equation,
        result: currentInput,
        intermediateResults: intermediateResults,
        intermediateEquations: intermediateEquations,
      })
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

  function calculateMarkup() {
    if (muBaseValue !== null) {
      try {
        const markupRate = Number.parseFloat(currentInput)
        if (isNaN(markupRate)) {
          currentInput = "Error"
        } else {
          const markupAmount = muBaseValue * (markupRate / 100)
          const result = muBaseValue + markupAmount
          currentInput = result.toString()
        }

        isMuMode = false
        muBaseValue = null
        cursorIndex = currentInput.length
        isCalculated = true

        // Add to history - store both equation and result
        history.push({
          equation: `${muBaseValue} + ${muBaseValue} × ${currentInput}/100`,
          result: currentInput,
        })
        historyIndex = history.length

        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        isMuMode = false
        muBaseValue = null
        cursorIndex = currentInput.length
        updateDisplay()
      }
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

        // Add to history - store both equation and result
        history.push({
          equation: `${currentValue} ${lastOperation} ${lastValue}`,
          result: currentInput,
        })
        historyIndex = history.length

        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        cursorIndex = currentInput.length
        updateDisplay()
      }
    }
  }

  // MU mode functions
  function enterMuMode() {
    try {
      muBaseValue = Number.parseFloat(currentInput)
      if (isNaN(muBaseValue)) {
        return
      }

      isMuMode = true
      currentInput = "0"
      cursorIndex = 1
      updateDisplay()
    } catch (error) {
      // Handle error
    }
  }

  function exitMuMode() {
    isMuMode = false
    muBaseValue = null
    currentInput = "0"
    cursorIndex = 1
    updateDisplay()
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

    if (isMuMode) {
      // Only add decimal if there isn't one already
      if (!currentInput.includes(".")) {
        insertAtCursor(".")
      }
      return
    }

    // Check if there's already a decimal in the current number segment
    const parts = currentInput.split(/[+\-×÷^/()]/)
    const currentPart = parts[parts.length - 1]

    if (!currentPart.includes(".")) {
      insertAtCursor(".")
    }
  })

  $("#add, #subtract, #multiply, #divide, #exponent").on("click", function () {
    if (isSettingTaxRate || isMuMode) return

    const value = $(this).text()

    // Map the button text to the correct operator
    let operator
    switch (value) {
      case "+":
        operator = "+"
        break
      case "-":
        operator = "-"
        break
      case "×":
        operator = "×"
        break
      case "÷":
        operator = "÷"
        break
      case "^":
        operator = "^"
        break
      default:
        operator = value
    }

    // If we just calculated a result, store the operation for repeat
    if (isCalculated) {
      lastOperation = operator
      lastValue = Number.parseFloat(currentInput)
    }

    insertAtCursor(operator)
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

    if (isMuMode) {
      // Toggle negative markup rate if needed
      if (currentInput.startsWith("-")) {
        currentInput = currentInput.substring(1)
      } else {
        currentInput = "-" + currentInput
      }
      cursorIndex = currentInput.length
      updateDisplay()
      return
    }

    if (isViewingHistory) {
      isViewingHistory = false
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
    if (isSettingTaxRate || isMuMode || isViewingHistory) return

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
    if (isSettingTaxRate || isMuMode || isViewingHistory) return

    try {
      // Save the equation before calculating
      const equation = `√(${currentInput})`

      const value = Math.sqrt(Number.parseFloat(currentInput))
      if (isNaN(value)) {
        currentInput = "Error"
      } else {
        currentInput = value.toString()
      }
      cursorIndex = currentInput.length
      isCalculated = true

      // Add to history - store both equation and result
      history.push({
        equation: equation,
        result: currentInput,
      })
      historyIndex = history.length

      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Fraction function
  $("#fraction").on("click", () => {
    if (isSettingTaxRate || isMuMode || isViewingHistory) return

    // If the display already shows a fraction with /, calculate it
    if (currentInput.includes("/")) {
      try {
        const parts = currentInput.split("/")
        if (parts.length === 2) {
          // Save the equation before calculating
          const equation = currentInput

          const decimal = Number.parseFloat(parts[0]) / Number.parseFloat(parts[1])
          currentInput = decimal.toString()
          cursorIndex = currentInput.length

          // Add to history - store both equation and result
          history.push({
            equation: equation,
            result: currentInput,
          })
          historyIndex = history.length

          updateDisplay()
        }
      } catch (error) {
        currentInput = "Error"
        cursorIndex = currentInput.length
        updateDisplay()
      }
      return
    }

    // Insert a slash for fraction
    insertAtCursor("/")
  })

  // Memory functions
  $("#rm-cm").on("click", () => {
    if (isSettingTaxRate || isMuMode || isViewingHistory) return

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
    if (isSettingTaxRate || isMuMode) return

    if (isViewingHistory) {
      isViewingHistory = false
    }

    try {
      memory += Number.parseFloat(currentInput)
      $memoryIndicator.css("opacity", "1")
      isCalculated = true
    } catch (error) {
      // Handle error
    }
  })

  $("#m-minus").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    if (isViewingHistory) {
      isViewingHistory = false
    }

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
    if (isSettingTaxRate || isMuMode) return

    if (isViewingHistory) {
      isViewingHistory = false
    }

    try {
      const value = Number.parseFloat(currentInput)
      const taxAmount = value * (taxRate / 100)

      // Save the equation before calculating
      const equation = `${value} - ${taxRate}%`

      currentInput = (value - taxAmount).toString()
      cursorIndex = currentInput.length
      isCalculated = true

      // Add to history - store both equation and result
      history.push({
        equation: equation,
        result: currentInput,
      })
      historyIndex = history.length

      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  $("#tax-plus").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    if (isViewingHistory) {
      isViewingHistory = false
    }

    try {
      const value = Number.parseFloat(currentInput)
      const taxAmount = value * (taxRate / 100)

      // Save the equation before calculating
      const equation = `${value} + ${taxRate}%`

      currentInput = (value + taxAmount).toString()
      cursorIndex = currentInput.length
      isCalculated = true

      // Add to history - store both equation and result
      history.push({
        equation: equation,
        result: currentInput,
      })
      historyIndex = history.length

      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Grand Total function
  $("#gt").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    if (isViewingHistory) {
      isViewingHistory = false
    }

    try {
      // Save the equation before calculating
      const equation = `GT + ${currentInput}`

      grandTotal += Number.parseFloat(currentInput)
      currentInput = grandTotal.toString()
      cursorIndex = currentInput.length
      isCalculated = true

      // Add to history - store both equation and result
      history.push({
        equation: equation,
        result: currentInput,
      })
      historyIndex = history.length

      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      updateDisplay()
    }
  })

  // Markup function
  $("#mu").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    if (isViewingHistory) {
      isViewingHistory = false
    }

    enterMuMode()
  })

  // Replace the RV button function with this one
  $("#rv").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    // If there's no history, nothing to review
    if (history.length === 0) return

    // Get the most recent calculation
    const lastCalc = history[history.length - 1]

    // If there are intermediate results, show the previous operation's result
    if (lastCalc.intermediateResults && lastCalc.intermediateResults.length > 1) {
      // Show the second-to-last intermediate result (the previous operation)
      const prevResult = lastCalc.intermediateResults[lastCalc.intermediateResults.length - 2]
      currentInput = prevResult.toString()
      cursorIndex = currentInput.length

      // Enter history review mode
      isViewingHistory = true
      historyIndex = history.length - 1

      // Update display with a visual indicator that we're in review mode
      updateDisplay()

      // Flash the display briefly to indicate review mode
      $display.addClass("reviewing")
      setTimeout(() => {
        $display.removeClass("reviewing")
      }, 300)
    }
  })

  // Add this to the CSS file via jQuery to avoid modifying the CSS file directly
  $("<style>")
    .prop("type", "text/css")
    .html(`
      .reviewing {
        background-color: #f0f8ff;
        transition: background-color 0.3s;
      }
    `)
    .appendTo("head")

  // Left and right parentheses
  $("#left-paren, #right-paren").on("click", function () {
    if (!isSettingTaxRate && !isMuMode) {
      insertAtCursor($(this).text())
    }
  })

  // Arrow key navigation
  $("#left-arrow").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    if (cursorIndex > 0) {
      cursorIndex--
      updateDisplay()
    }
  })

  $("#right-arrow").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    if (cursorIndex < currentInput.length) {
      cursorIndex++
      updateDisplay()
    }
  })

  // Update the up/down arrow navigation to work with intermediate results
  $("#up-arrow").on("click", () => {
    if (isSettingTaxRate || isMuMode) return
    if (history.length === 0) return

    // If not already in history view mode, enter it
    if (!isViewingHistory) {
      isViewingHistory = true
      historyIndex = history.length - 1

      // Start by showing the final result
      currentInput = history[historyIndex].result
      cursorIndex = currentInput.length
      updateDisplay()
      return
    }

    // If we're viewing history, cycle through intermediate results in reverse
    const currentCalc = history[historyIndex]
    if (currentCalc.intermediateResults) {
      // Find the current position in the intermediate results
      let currentPos = -1
      for (let i = 0; i < currentCalc.intermediateResults.length; i++) {
        if (currentInput === currentCalc.intermediateResults[i].toString()) {
          currentPos = i
          break
        }
      }

      // Move to the previous intermediate result
      if (currentPos > 0) {
        currentInput = currentCalc.intermediateResults[currentPos - 1].toString()
        cursorIndex = currentInput.length
        updateDisplay()
      }
    }
  })

  $("#down-arrow").on("click", () => {
    if (isSettingTaxRate || isMuMode) return
    if (!isViewingHistory || history.length === 0) return

    // If we're viewing history, cycle through intermediate results
    const currentCalc = history[historyIndex]
    if (currentCalc.intermediateResults) {
      // Find the current position in the intermediate results
      let currentPos = -1
      for (let i = 0; i < currentCalc.intermediateResults.length; i++) {
        if (currentInput === currentCalc.intermediateResults[i].toString()) {
          currentPos = i
          break
        }
      }

      // Move to the next intermediate result
      if (currentPos >= 0 && currentPos < currentCalc.intermediateResults.length - 1) {
        currentInput = currentCalc.intermediateResults[currentPos + 1].toString()
        cursorIndex = currentInput.length
        updateDisplay()
      } else if (currentPos === currentCalc.intermediateResults.length - 1) {
        // If at the end of intermediate results, return to normal mode
        isViewingHistory = false
        currentInput = "0"
        cursorIndex = 1
        updateDisplay()
      }
    }
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
