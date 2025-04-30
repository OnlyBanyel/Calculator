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

  // Add these variable initializations near the top of the $(document).ready() function, after the other state variables
  let isFractionMode = false
  let activeFractionPart = "numerator"
  let fractionData = { numerator: "", denominator: "" }

  // Initialize display and indicators
  $muIndicator.css("opacity", "0") // Explicitly hide MU indicator on initialization
  $memoryIndicator.css("opacity", "0") // Hide memory indicator initially
  updateDisplay()

  // Helper functions
  // Modify the updateDisplay function to handle fractions properly
  // Find the updateDisplay function and replace it with this version
  function updateDisplay() {
    let displayValue = currentInput
    let formattedDisplay = currentInput

    if (isFractionMode) {
      renderFraction()
      return
    }

    // Format the display value
    if (!isSettingTaxRate && !isMuMode && !isViewingHistory) {
      // Only format numbers, not error messages or special states
      if (!isNaN(Number.parseFloat(displayValue)) && displayValue !== "Error") {
        // Split by operators to format each number part
        const parts = displayValue.split(/[(+\-×÷^/()]/)
        formattedDisplay = ""

        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            // Number part
            if (!isNaN(Number.parseFloat(parts[i]))) {
              formattedDisplay += formatNumberWithCommas(parts[i])
            } else {
              formattedDisplay += parts[i]
            }
          } else {
            // Operator part
            formattedDisplay += parts[i]
          }
        }
      }

      displayValue = formattedDisplay
    }

    // Update the display with the formatted value
    $("#display").html(displayValue)

    // Add the cursor at the correct position
    if (!isSettingTaxRate && !isMuMode && !isViewingHistory) {
      // Create a temporary container to measure text width
      const tempContainer = $("<div>")
        .css({
          position: "absolute",
          visibility: "hidden",
          height: "auto",
          width: "auto",
          whiteSpace: "nowrap",
          font: $("#display").css("font"),
          fontSize: $("#display").css("font-size"),
        })
        .appendTo("body")

      // Get text before cursor
      const textBeforeCursor = displayValue.substring(0, cursorIndex)
      tempContainer.text(textBeforeCursor)

      // Calculate cursor position
      const displayWidth = $("#display").width()
      const textWidth = tempContainer.width()
      const cursorPosition = Math.min(textWidth, displayWidth - 2)

      // Remove the temporary container
      tempContainer.remove()

      // Insert cursor at the calculated position
      const displayText = $("#display").html()
      const cursorHtml = `<span class="cursor-indicator" style="position: relative; display: inline-block; width: 0;">
                          <span style="position: absolute; bottom: 0; left: 0; width: 1px; height: 18px; background-color: black; animation: blink 1s infinite;"></span>
                        </span>`

      if (cursorIndex === 0) {
        $("#display").html(cursorHtml + displayText)
      } else if (cursorIndex >= displayText.length) {
        $("#display").html(displayText + cursorHtml)
      } else {
        $("#display").html(displayText.substring(0, cursorIndex) + cursorHtml + displayText.substring(cursorIndex))
      }
    }

    // Update indicators
    $memoryIndicator.css("opacity", memory !== 0 ? "1" : "0")
    $muIndicator.css("opacity", isMuMode ? "1" : "0")
  }

  // Helper function to format numbers with commas
  function formatNumberWithCommas(numStr) {
    // Don't format if it's not a valid number
    if (numStr === "") {
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

    if (isFractionMode) {
      isFractionMode = false
      currentInput = "0"
      cursorIndex = 1
      updateDisplay()
    } else {
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

    if (isFractionMode) {
      fractionData[activeFractionPart] = ""
      renderFraction()
    } else if (isCalculated) {
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

    if (isFractionMode) {
      if (fractionData[activeFractionPart].length > 0) {
        fractionData[activeFractionPart] = fractionData[activeFractionPart].slice(0, -1)
        renderFraction()
      }
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

  // Button click handlers
  // Fix: Only select number buttons that are not double-zero
  $(".number:not(#double-zero)").on("click", function () {
    const value = $(this).text()
    handleDigitInput(value)
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
    if (isFractionMode) {
      calculateFraction()
    } else if (isCalculated) {
      repeatLastOperation()
    } else {
      calculate()
    }
  })

  $("#on-c").on("click", () => {
    if (isFractionMode) {
      isFractionMode = false
      currentInput = "0"
      cursorIndex = 1
      updateDisplay()
    } else {
      clearAll()
    }
  })

  $("#ce").on("click", () => {
    if (isFractionMode) {
      fractionData[activeFractionPart] = ""
      renderFraction()
    } else {
      clearEntry()
    }
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

  // Replace the existing renderFraction function with this improved version
  function renderFraction() {
    // Add custom styles for fraction mode
    if (!$("#fraction-styles").length) {
      $("<style>")
        .attr("id", "fraction-styles")
        .prop("type", "text/css")
        .html(`
      .fraction-container {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
        height: 100%;
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
      }
      .numerator, .denominator {
        padding: 2px 5px;
        min-width: 30px;
        text-align: right;
        border-radius: 3px;
        font-size: 16px;
        position: relative;
      }
      .fraction-bar {
        height: 1px;
        background-color: black;
        width: 80%;
        max-width: 40px;
        margin: 3px 0;
        align-self: flex-end;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `)
        .appendTo("head")
    }

    // Create the fraction display with improved styling and cursor
    const numeratorContent = fractionData.numerator || "&nbsp;"
    const denominatorContent = fractionData.denominator || "&nbsp;"

    // Add cursor to the active part
    const numeratorWithCursor =
      activeFractionPart === "numerator"
        ? numeratorContent +
          '<span class="cursor-indicator" style="display: inline-block; width: 0;"><span style="position: absolute; bottom: 0; width: 1px; height: 14px; background-color: black; animation: blink 1s infinite;"></span></span>'
        : numeratorContent

    const denominatorWithCursor =
      activeFractionPart === "denominator"
        ? denominatorContent +
          '<span class="cursor-indicator" style="display: inline-block; width: 0;"><span style="position: absolute; bottom: 0; width: 1px; height: 14px; background-color: black; animation: blink 1s infinite;"></span></span>'
        : denominatorContent

    $("#display").html(`
    <div class="fraction-container">
      <div class="numerator">
        ${numeratorWithCursor}
      </div>
      <div class="fraction-bar"></div>
      <div class="denominator">
        ${denominatorWithCursor}
      </div>
    </div>
  `)

    // Adjust the width of the fraction bar based on the content
    const numeratorWidth = $(".numerator").width()
    const denominatorWidth = $(".denominator").width()
    const maxWidth = Math.max(numeratorWidth, denominatorWidth)
    $(".fraction-bar").css("width", Math.min(maxWidth, 40) + "px")
  }

  // Replace the existing handleDigitInput function with this improved version
  function handleDigitInput(digit) {
    if (isFractionMode) {
      fractionData[activeFractionPart] += digit
      renderFraction()
    } else {
      insertAtCursor(digit)
    }
  }

  // Add this new function to handle fraction calculations
  function calculateFraction() {
    if (fractionData.numerator && fractionData.denominator) {
      try {
        // Instead of directly parsing as integers, evaluate the expressions
        const numeratorExpression = fractionData.numerator
        const denominatorExpression = fractionData.denominator

        // Handle basic operations in the numerator
        let numeratorValue
        try {
          // Use a safe evaluation approach for the numerator expression
          if (numeratorExpression.match(/[+\-×÷^/]/)) {
            // Split the input by operators while keeping the operators
            const tokens = numeratorExpression.split(/([+\-×÷^/])/).filter((token) => token !== "")

            // Process the tokens sequentially
            numeratorValue = Number.parseFloat(tokens[0])

            for (let i = 1; i < tokens.length; i += 2) {
              const operator = tokens[i]
              const operand = Number.parseFloat(tokens[i + 1])

              // Perform the operation
              switch (operator) {
                case "+":
                  numeratorValue += operand
                  break
                case "-":
                  numeratorValue -= operand
                  break
                case "×":
                  numeratorValue *= operand
                  break
                case "÷":
                  numeratorValue /= operand
                  break
                case "^":
                  numeratorValue = Math.pow(numeratorValue, operand)
                  break
                case "/":
                  numeratorValue /= operand
                  break
              }
            }
          } else {
            numeratorValue = Number.parseFloat(numeratorExpression)
          }
        } catch (error) {
          // If there's an error, try a simple parse
          numeratorValue = Number.parseFloat(numeratorExpression)
        }

        // Handle basic operations in the denominator
        let denominatorValue
        try {
          // Use a safe evaluation approach for the denominator expression
          if (denominatorExpression.match(/[+\-×÷^/]/)) {
            // Split the input by operators while keeping the operators
            const tokens = denominatorExpression.split(/([+\-×÷^/])/).filter((token) => token !== "")

            // Process the tokens sequentially
            denominatorValue = Number.parseFloat(tokens[0])

            for (let i = 1; i < tokens.length; i += 2) {
              const operator = tokens[i]
              const operand = Number.parseFloat(tokens[i + 1])

              // Perform the operation
              switch (operator) {
                case "+":
                  denominatorValue += operand
                  break
                case "-":
                  denominatorValue -= operand
                  break
                case "×":
                  denominatorValue *= operand
                  break
                case "÷":
                  denominatorValue /= operand
                  break
                case "^":
                  denominatorValue = Math.pow(denominatorValue, operand)
                  break
                case "/":
                  denominatorValue /= operand
                  break
              }
            }
          } else {
            denominatorValue = Number.parseFloat(denominatorExpression)
          }
        } catch (error) {
          // If there's an error, try a simple parse
          denominatorValue = Number.parseFloat(denominatorExpression)
        }

        if (denominatorValue === 0) {
          currentInput = "Error"
          isFractionMode = false
        } else {
          currentInput = (numeratorValue / denominatorValue).toString()

          // Add to history
          history.push({
            equation: `${fractionData.numerator}/${fractionData.denominator}`,
            result: currentInput,
          })
          historyIndex = history.length

          isFractionMode = false
        }
        cursorIndex = currentInput.length
        isCalculated = true
        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        isFractionMode = false
        cursorIndex = currentInput.length
        isCalculated = true
        updateDisplay()
      }
    }
  }

  // Add this function to exit fraction mode
  function exitFractionMode() {
    if (fractionData.numerator && fractionData.denominator) {
      calculateFraction()
    } else {
      isFractionMode = false
      currentInput = "0"
      cursorIndex = 1
      updateDisplay()
    }
  }

  // Modify the fraction button click handler
  // Replace the existing fraction button click handler with this improved version
  $("#fraction").on("click", () => {
    if (isSettingTaxRate || isMuMode || isViewingHistory) return

    // If already in fraction mode, calculate the result
    if (isFractionMode) {
      calculateFraction()
    } else {
      // Enter fraction mode
      isFractionMode = true
      activeFractionPart = "numerator"
      fractionData = { numerator: "", denominator: "" }
      renderFraction()
    }
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
  // Modify the left and right arrow handlers to work with fractions
  $("#left-arrow").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    if (isFractionMode) {
      // In fraction mode, move cursor within the active part
      const currentPart = fractionData[activeFractionPart]
      if (currentPart.length > 0) {
        // For now, we'll just implement a simple version -
        // in a real implementation, you'd track cursor position within the fraction part
        fractionData[activeFractionPart] = currentPart.slice(0, -1)
        renderFraction()
      }
      return
    }

    if (cursorIndex > 0) {
      cursorIndex--
      updateDisplay()
    }
  })

  $("#right-arrow").on("click", () => {
    if (isSettingTaxRate || isMuMode) return

    if (isFractionMode) {
      // In fraction mode, we could implement cursor movement within the fraction
      // For now, we'll just switch between numerator and denominator
      activeFractionPart = activeFractionPart === "numerator" ? "denominator" : "numerator"
      renderFraction()
      return
    }

    if (cursorIndex < currentInput.length) {
      cursorIndex++
      updateDisplay()
    }
  })

  // Modify the up/down arrow handlers to properly handle fraction mode
  // Replace the existing up/down arrow click handlers with these
  $("#up-arrow").on("click", () => {
    if (isFractionMode) {
      activeFractionPart = "numerator"
      renderFraction()
      return
    }

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
    if (isFractionMode) {
      activeFractionPart = "denominator"
      renderFraction()
      return
    }

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

  function saveTaxRate() {
    const newTaxRate = Number.parseFloat(currentInput.substring(10))
    if (!isNaN(newTaxRate)) {
      taxRate = newTaxRate
    }
    exitTaxRateMode()
  }
})

// Remove the old cursor position element from the DOM since we're using inline cursors now
$("#cursor-position").remove()

// Add a global style for the blinking cursor animation
if (!$("#cursor-animation").length) {
  $("<style>")
    .attr("id", "cursor-animation")
    .prop("type", "text/css")
    .html(`
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `)
    .appendTo("head")
}

// Find the calculateFraction function and replace it with this enhanced version
function calculateFraction() {
  if (fractionData.numerator && fractionData.denominator) {
    try {
      // Instead of directly parsing as integers, evaluate the expressions
      const numeratorExpression = fractionData.numerator
      const denominatorExpression = fractionData.denominator

      // Handle basic operations in the numerator
      let numeratorValue
      try {
        // Use a safe evaluation approach for the numerator expression
        if (numeratorExpression.match(/[+\-×÷^/]/)) {
          // Split the input by operators while keeping the operators
          const tokens = numeratorExpression.split(/([+\-×÷^/])/).filter((token) => token !== "")

          // Process the tokens sequentially
          numeratorValue = Number.parseFloat(tokens[0])

          for (let i = 1; i < tokens.length; i += 2) {
            const operator = tokens[i]
            const operand = Number.parseFloat(tokens[i + 1])

            // Perform the operation
            switch (operator) {
              case "+":
                numeratorValue += operand
                break
              case "-":
                numeratorValue -= operand
                break
              case "×":
                numeratorValue *= operand
                break
              case "÷":
                numeratorValue /= operand
                break
              case "^":
                numeratorValue = Math.pow(numeratorValue, operand)
                break
              case "/":
                numeratorValue /= operand
                break
            }
          }
        } else {
          numeratorValue = Number.parseFloat(numeratorExpression)
        }
      } catch (error) {
        // If there's an error, try a simple parse
        numeratorValue = Number.parseFloat(numeratorExpression)
      }

      // Handle basic operations in the denominator
      let denominatorValue
      try {
        // Use a safe evaluation approach for the denominator expression
        if (denominatorExpression.match(/[+\-×÷^/]/)) {
          // Split the input by operators while keeping the operators
          const tokens = denominatorExpression.split(/([+\-×÷^/])/).filter((token) => token !== "")

          // Process the tokens sequentially
          denominatorValue = Number.parseFloat(tokens[0])

          for (let i = 1; i < tokens.length; i += 2) {
            const operator = tokens[i]
            const operand = Number.parseFloat(tokens[i + 1])

            // Perform the operation
            switch (operator) {
              case "+":
                denominatorValue += operand
                break
              case "-":
                denominatorValue -= operand
                break
              case "×":
                denominatorValue *= operand
                break
              case "÷":
                denominatorValue /= operand
                break
              case "^":
                denominatorValue = Math.pow(denominatorValue, operand)
                break
              case "/":
                denominatorValue /= operand
                break
            }
          }
        } else {
          denominatorValue = Number.parseFloat(denominatorExpression)
        }
      } catch (error) {
        // If there's an error, try a simple parse
        denominatorValue = Number.parseFloat(denominatorExpression)
      }

      if (denominatorValue === 0) {
        currentInput = "Error"
        isFractionMode = false
      } else {
        currentInput = (numeratorValue / denominatorValue).toString()

        // Add to history
        history.push({
          equation: `${fractionData.numerator}/${fractionData.denominator}`,
          result: currentInput,
        })
        historyIndex = history.length

        isFractionMode = false
      }
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    } catch (error) {
      currentInput = "Error"
      isFractionMode = false
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    }
  }
}

// Update the handleDigitInput function to allow operators in fraction mode
function handleDigitInput(digit) {
  if (isFractionMode) {
    fractionData[activeFractionPart] += digit
    renderFraction()
  } else {
    insertAtCursor(digit)
  }
}

// Add this function to allow operators in fraction mode
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

  // If we're in fraction mode, add the operator to the active fraction part
  if (isFractionMode) {
    fractionData[activeFractionPart] += operator
    renderFraction()
    return
  }

  // If we just calculated a result, store the operation for repeat
  if (isCalculated) {
    lastOperation = operator
    lastValue = Number.parseFloat(currentInput)
  }

  insertAtCursor(operator)
})
