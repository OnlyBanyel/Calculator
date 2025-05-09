;(($) => {
  jQuery(document).ready(() => {
    // DOM elements
    const $display = jQuery("#display")
    const $memoryIndicator = jQuery("#memory-indicator")
    const $cursorPosition = jQuery("#cursor-position")
    const $muIndicator = jQuery("#mu-indicator")

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
    // Fraction mode variables
    let isFractionMode = false
    let activeFractionPart = "numerator"
    let fractionData = { numerator: "", denominator: "" }
    let fractionCursorPos = {
      numerator: 0,
      denominator: 0,
    }

    // Parentheses tracking
    let openParenCount = 0

    // Initialize display and indicators
    $muIndicator.css("opacity", "0") // Explicitly hide MU indicator on initialization
    $memoryIndicator.css("opacity", "0") // Hide memory indicator initially

    // Add GT indicator
    if (jQuery("#gt-indicator").length === 0) {
      jQuery(".display-container").append(
        '<div id="gt-indicator" style="position: absolute; top: 5px; left: 30px; font-size: 12px; opacity: 0;">GT</div>',
      )
    }

    // Add parentheses counter indicator
    if (jQuery("#paren-indicator").length === 0) {
      jQuery(".display-container").append(
        '<div id="paren-indicator" style="position: absolute; bottom: 5px; left: 10px; font-size: 12px; opacity: 0;"></div>',
      )
    }

    // Add styles for indicators
    jQuery("<style>")
      .prop("type", "text/css")
      .html(
        `
        #gt-indicator, #mu-indicator, #memory-indicator, #paren-indicator {
          transition: opacity 0.3s ease;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        `,
      )
      .appendTo("head")

    // Add fraction styles
    jQuery("<style>")
      .attr("id", "fraction-styles")
      .prop("type", "text/css")
      .html(
        `
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
          max-width: 90%; /* Increase max width to allow longer equations */
        }
        .numerator, .denominator {
          padding: 2px 5px;
          min-width: 30px;
          max-width: 100%; /* Allow full width */
          text-align: right;
          border-radius: 3px;
          font-size: 16px;
          position: relative;
          white-space: nowrap; /* Keep text on one line */
          overflow: auto; /* Add scrolling if needed */
          scrollbar-width: none; /* Hide scrollbar in Firefox */
          -ms-overflow-style: none; /* Hide scrollbar in IE/Edge */
        }
        .numerator::-webkit-scrollbar, .denominator::-webkit-scrollbar {
          display: none; /* Hide scrollbar in Chrome/Safari */
        }
        .fraction-bar {
          height: 1px;
          background-color: black;
          width: 100%; /* Make bar match the width of the longer part */
          margin: 3px 0;
          align-self: flex-end;
        }
        .reviewing {
          background-color: #f0f8ff;
          transition: background-color 0.3s;
        }
        `,
      )
      .appendTo("head")

    updateDisplay()

    // Helper functions
    function updateDisplay() {
      let displayValue = currentInput
      let formattedDisplay = currentInput

      if (isFractionMode) {
        renderFractionWithCursor()
        return
      }

      // Format the display value
      if (!isSettingTaxRate && !isMuMode && !isViewingHistory) {
        // Only format numbers, not error messages or special states
        if (!isNaN(Number.parseFloat(displayValue)) && displayValue !== "Error") {
          // Split by operators to format each number part
          const parts = displayValue.split(/([+\-×÷^/()])/)
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
      jQuery("#display").html(displayValue)

      // Add the cursor at the correct position
      if (!isSettingTaxRate && !isMuMode && !isViewingHistory) {
        // Create a temporary container to measure text width
        const tempContainer = jQuery("<div>")
          .css({
            position: "absolute",
            visibility: "hidden",
            height: "auto",
            width: "auto",
            whiteSpace: "nowrap",
            font: jQuery("#display").css("font"),
            fontSize: jQuery("#display").css("font-size"),
          })
          .appendTo("body")

        // Get text before cursor
        const textBeforeCursor = displayValue.substring(0, cursorIndex)
        tempContainer.text(textBeforeCursor)

        // Calculate cursor position
        const displayWidth = jQuery("#display").width()
        const textWidth = tempContainer.width()
        const cursorPosition = Math.min(textWidth, displayWidth - 2)

        // Remove the temporary container
        tempContainer.remove()

        // Insert cursor at the calculated position
        const cursorHtml = `<span class="cursor" style="border-left: 1px solid black; height: 20px;"></span>`
        const displayText = jQuery("#display").text()

        if (cursorIndex <= 0) {
          jQuery("#display").html(cursorHtml + displayText)
        } else if (cursorIndex >= displayText.length) {
          jQuery("#display").html(displayText + cursorHtml)
        } else {
          jQuery("#display").html(
            displayText.substring(0, cursorIndex) + cursorHtml + displayText.substring(cursorIndex),
          )
        }

        // Scroll to cursor
        const cursorPos = jQuery(".cursor").position()
        if (cursorPos) {
          jQuery("#display").scrollLeft(cursorPos.left - 50)
        }
      }

      // Update indicators
      $memoryIndicator.css("opacity", memory !== 0 ? "1" : "0")
      $muIndicator.css("opacity", isMuMode ? "1" : "0")

      // Update GT indicator
      if (grandTotal !== 0) {
        jQuery("#gt-indicator").css("opacity", "1")
      } else {
        jQuery("#gt-indicator").css("opacity", "0")
      }

      // Update parentheses indicator
      updateParenIndicator()
    }

    function updateParenIndicator() {
      if (openParenCount > 0) {
        jQuery("#paren-indicator").text(`(${openParenCount})`).css("opacity", "1")
      } else {
        jQuery("#paren-indicator").css("opacity", "0")
      }
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
      if (isRootMode) {
        if (text === ")") {
          // Complete the degree specification
          if (currentInput.includes("(") && !currentInput.includes(")")) {
            currentInput = currentInput.substring(0, cursorIndex) + ")" + currentInput.substring(cursorIndex)
            cursorIndex++
            updateDisplay()
          }
        } else if (!isNaN(text) && currentInput.includes("(") && !currentInput.includes(")")) {
          // Add digit to root degree
          currentInput = currentInput.substring(0, cursorIndex) + text + currentInput.substring(cursorIndex)
          cursorIndex++
          updateDisplay()
        } else if (!isNaN(text) || text === ".") {
          // Add digit to the value being rooted
          currentInput = currentInput.substring(0, cursorIndex) + text + currentInput.substring(cursorIndex)
          cursorIndex++
          updateDisplay()
        }
        return
      }
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
        if (!isNaN(text) || text === "." || text === "(" || text === ")") {
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
        if (!isNaN(text) || text === "." || text === "(" || text === ")") {
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
        } else if (currentInput === "0" && (text === "(" || text === ")")) {
          // Allow parentheses to replace the initial 0
          currentInput = text
          currentEquation = text
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
        lastOperation = null
        lastValue = null
        return
      }

      if (isMuMode) {
        exitMuMode()
        lastOperation = null
        lastValue = null
        return
      }

      if (isFractionMode) {
        isFractionMode = false
        currentInput = "0"
        cursorIndex = 1
        lastOperation = null
        lastValue = null
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
        grandTotal = 0
        openParenCount = 0
        jQuery("#gt-indicator").css("opacity", "0")
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
        fractionCursorPos[activeFractionPart] = 0
        renderFractionWithCursor()
      } else if (isCalculated) {
        clearAll()
      } else {
        currentInput = "0"
        currentEquation = ""
        cursorIndex = 1
        displayScrollPosition = 0
        lastOperation = null
        lastValue = null
        updateDisplay()
      }
    }

    function deleteAtCursor() {
      if (isRootMode) {
        const rootPos = currentInput.indexOf("√")

        if (cursorIndex > 0) {
          if (cursorIndex <= rootPos) {
            // Deleting from degree
            currentInput = currentInput.substring(0, cursorIndex - 1) + currentInput.substring(cursorIndex)

            // Ensure we don't delete the √ symbol
            if (currentInput.indexOf("√") === -1) {
              currentInput = "2√" + currentInput
              cursorIndex = 1
            } else {
              cursorIndex--
            }
          } else {
            // Deleting from radicand
            currentInput = currentInput.substring(0, cursorIndex - 1) + currentInput.substring(cursorIndex)
            cursorIndex--
          }

          updateDisplay()
        }
        return
      }
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
        const pos = fractionCursorPos[activeFractionPart]
        if (pos > 0) {
          const currentValue = fractionData[activeFractionPart]
          fractionData[activeFractionPart] = currentValue.substring(0, pos - 1) + currentValue.substring(pos)
          fractionCursorPos[activeFractionPart]--
          renderFractionWithCursor()
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

    // Calculation functions
    function calculate() {
      if (isRootMode) {
        calculateRoot()
        return
      }
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

      const equation = currentInput
      let result

      // Check if we should repeat the last operation
      if (isCalculated && lastOperation && lastValue !== null) {
        // Repeat the last operation with the same operand
        const currentValue = Number.parseFloat(currentInput)
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
      } else {
        // Normal calculation
        // Always use PEMDAS evaluation regardless of operator count
        result = evaluateWithPEMDAS(currentInput)
      }

      if (isNaN(result) || !isFinite(result)) {
        currentInput = "Error"
      } else {
        currentInput = Number.parseFloat(result.toFixed(10)).toString()
        if (currentInput.includes(".")) {
          currentInput = currentInput.replace(/\.?0+$/, "")
        }
      }

      cursorIndex = currentInput.length
      isCalculated = true
      displayScrollPosition = 0

      history.push({
        equation: equation,
        result: currentInput,
      })
      historyIndex = history.length

      updateDisplay()
    }

    function calculateMarkup() {
      if (muBaseValue !== null) {
        const markupRate = Number.parseFloat(currentInput)
        if (isNaN(markupRate)) {
          console.log("Invalid markup rate")
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
      }
    }

    // Find the fraction button click handler and replace it with this updated version
    jQuery("#fraction").on("click", () => {
      if (isSettingTaxRate || isMuMode || isViewingHistory) return

      // If already in fraction mode, calculate the result
      if (isFractionMode) {
        calculateFraction()
      } else {
        // Enter fraction mode
        isFractionMode = true
        activeFractionPart = "numerator"

        // Find the last number in the expression
        let lastNumberStart = currentInput.length
        let expressionPrefix = ""

        // Look for the last operator in the input
        const operators = ["+", "-", "×", "÷", "^", "("]
        for (let i = currentInput.length - 1; i >= 0; i--) {
          if (operators.includes(currentInput[i])) {
            lastNumberStart = i + 1
            expressionPrefix = currentInput.substring(0, lastNumberStart)
            break
          }
        }

        // Store the expression prefix (everything before the last number)
        fractionData.expressionPrefix = expressionPrefix

        // Get the last number from the input
        const lastNumber = currentInput.substring(lastNumberStart)

        // If there's a valid number, use it as the numerator
        if (lastNumber !== "" && !isNaN(Number.parseFloat(lastNumber))) {
          fractionData = {
            ...fractionData,
            expressionPrefix: expressionPrefix,
            numerator: lastNumber,
            denominator: "",
          }
          fractionCursorPos = {
            numerator: lastNumber.length,
            denominator: 0,
          }
        } else {
          fractionData = {
            ...fractionData,
            expressionPrefix: expressionPrefix,
            numerator: "",
            denominator: "",
          }
          fractionCursorPos = {
            numerator: 0,
            denominator: 0,
          }
        }

        renderFractionWithCursor()
      }
    })

    // Update the calculateFraction function to handle expression prefixes
    function calculateFraction() {
      if (!fractionData.denominator || Number(fractionData.denominator) === 0) {
        currentInput = "Error"
        isFractionMode = false
        updateDisplay()
        return
      }

      try {
        const numerator = processFractionPart(fractionData.numerator || "0")
        const denominator = processFractionPart(fractionData.denominator || "1")

        if (denominator === 0) throw new Error("Division by zero")

        const result = numerator / denominator
        const fractionResult = Number.isInteger(result) ? result.toString() : result.toFixed(10).replace(/\.?0+$/, "")

        // Combine the expression prefix with the fraction result
        currentInput = fractionData.expressionPrefix + fractionResult

        history.push({
          equation: `${fractionData.expressionPrefix}${fractionData.numerator}/${fractionData.denominator}`,
          result: currentInput,
        })

        isFractionMode = false
        cursorIndex = currentInput.length
        isCalculated = false // Don't mark as calculated so user can continue the expression
        updateDisplay()
      } catch (error) {
        currentInput = "Error"
        isFractionMode = false
        updateDisplay()
      }
    }

    // Update the renderFractionWithCursor function to show the expression prefix
    // Update the renderFractionWithCursor function to keep everything right-aligned
    function renderFractionWithCursor() {
      // Create the fraction display with improved styling and cursor
      // Replace special characters for proper HTML display
      const numeratorContent = fractionData.numerator.replace(/</g, "&lt;").replace(/>/g, "&gt;") || "&nbsp;"
      const denominatorContent = fractionData.denominator.replace(/</g, "&lt;").replace(/>/g, "&gt;") || "&nbsp;"
      const expressionPrefix = fractionData.expressionPrefix || ""

      // Add cursor at the specific position
      let numeratorWithCursor = numeratorContent
      let denominatorWithCursor = denominatorContent

      if (activeFractionPart === "numerator") {
        const pos = Math.min(fractionCursorPos.numerator, numeratorContent.length)
        numeratorWithCursor =
          numeratorContent.substring(0, pos) +
          '<span class="cursor-indicator" style="display: inline-block; width: 0;"><span style="position: absolute; bottom: 0; width: 1px; height: 14px; background-color: black; animation: blink 1s infinite;"></span></span>' +
          numeratorContent.substring(pos)
      } else {
        const pos = Math.min(fractionCursorPos.denominator, denominatorContent.length)
        denominatorWithCursor =
          denominatorContent.substring(0, pos) +
          '<span class="cursor-indicator" style="display: inline-block; width: 0;"><span style="position: absolute; bottom: 0; width: 1px; height: 14px; background-color: black; animation: blink 1s infinite;"></span></span>' +
          denominatorContent.substring(pos)
      }

      // Create a right-aligned display with the fraction
      jQuery("#display").html(`
    <div style="display: flex; justify-content: flex-end; align-items: center; height: 100%; width: 100%;">
      <div style="display: flex; align-items: center; justify-content: flex-end; width: 100%;">
        <div style="text-align: right;">${expressionPrefix}</div>
        <div class="fraction-container" style="position: relative; transform: none; right: auto; top: auto; margin-left: 5px;">
          <div class="numerator">
            ${numeratorWithCursor}
          </div>
          <div class="fraction-bar"></div>
          <div class="denominator">
            ${denominatorWithCursor}
          </div>
        </div>
      </div>
    </div>
  `)

      // Adjust the width of the fraction bar based on the content
      const numeratorWidth = jQuery(".numerator").width()
      const denominatorWidth = jQuery(".denominator").width()
      const maxWidth = Math.max(numeratorWidth, denominatorWidth)

      // Set minimum width but allow it to grow as needed
      // Make the fraction bar shorter by using 80% of the calculated width
      jQuery(".fraction-bar").css("width", Math.max(Math.min(maxWidth * 0.8, 60), 30) + "px")

      // Auto-scroll to show the cursor
      if (activeFractionPart === "numerator") {
        // Calculate scroll position to make cursor visible
        const cursorPos = fractionCursorPos.numerator
        const $numerator = jQuery(".numerator")
        const scrollPos = Math.max(0, cursorPos * 8 - $numerator.width() + 20)
        $numerator.scrollLeft(scrollPos)
      } else {
        // Calculate scroll position to make cursor visible
        const cursorPos = fractionCursorPos.denominator
        const $denominator = jQuery(".denominator")
        const scrollPos = Math.max(0, cursorPos * 8 - $denominator.width() + 20)
        $denominator.scrollLeft(scrollPos)
      }
    }

    // Update the exitFractionMode function to handle expression prefixes
    function exitFractionMode() {
      if (fractionData.numerator && fractionData.denominator) {
        calculateFraction()
      } else {
        isFractionMode = false
        // Restore the expression prefix if we're exiting without calculating
        currentInput = fractionData.expressionPrefix ? fractionData.expressionPrefix + "0" : "0"
        cursorIndex = currentInput.length
        updateDisplay()
      }
    }

    function processFractionPart(expression) {
      // Handle implicit multiplication
      expression = expression.replace(/(\d+)\(/g, "$1*(")
      expression = expression.replace(/\)(\d+)/g, ")*$1")

      // Replace operators
      expression = expression.replace(/×/g, "*").replace(/÷/g, "/")

      // Handle square roots - convert √(x) to Math.sqrt(x)
      expression = expression.replace(/√$$([^)]+)$$/g, "Math.sqrt($1)")

      // First handle parentheses in exponents
      expression = expression.replace(/$$([^)]+)$$\^$$([^)]+)$$/g, "Math.pow(($1),($2))")
      expression = expression.replace(/$$([^)]+)$$\^(\d+\.?\d*)/g, "Math.pow(($1),$2)")
      expression = expression.replace(/(\d+\.?\d*)\^$$([^)]+)$$/g, "Math.pow($1,($2))")

      // Then handle simple number exponents
      expression = expression.replace(/(\d+\.?\d*)\^(\d+\.?\d*)/g, "Math.pow($1,$2)")

      // Add safety parentheses
      expression = `(${expression})`

      console.log("Processing expression:", expression) // Debug log

      try {
        return new Function("return " + expression)()
      } catch (e) {
        console.error("Evaluation error:", e)
        throw new Error("Invalid expression")
      }
    }

    function repeatLastOperation() {
      if (lastOperation && lastValue !== null) {
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
            if (lastValue === 0) {
              console.log("Division by zero error")
              result = Number.NaN
              break
            }
            result = currentValue / lastValue
            break
          case "^":
            result = Math.pow(currentValue, lastValue)
            break
        }

        if (isNaN(result) || !isFinite(result)) {
          console.log("Calculation error in repeat operation")
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
      }
    }

    // Mode functions
    function enterMuMode() {
      muBaseValue = Number.parseFloat(currentInput)
      if (isNaN(muBaseValue)) {
        console.log("Invalid base value for markup")
        return
      }

      isMuMode = true
      currentInput = "0"
      cursorIndex = 1
      updateDisplay()
    }

    function exitMuMode() {
      isMuMode = false
      muBaseValue = null
      currentInput = "0"
      cursorIndex = 1
      updateDisplay()
    }

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
      const rateStr = currentInput.substring(10).trim()
      const newTaxRate = Number.parseFloat(rateStr)

      if (!isNaN(newTaxRate)) {
        taxRate = Math.min(100, Math.max(0, newTaxRate)) // Clamp between 0-100
      }
      exitTaxRateMode()
    }

    // Fraction mode functions
    function handleDigitInput(digit) {
      if (isRootMode) {
        const rootPos = currentInput.indexOf("√")

        if (cursorIndex <= rootPos) {
          // Editing the degree (before √)
          if (cursorIndex === 0) {
            // Insert at beginning
            currentInput = digit + currentInput
          } else {
            // Insert at cursor position
            currentInput = currentInput.substring(0, cursorIndex) + digit + currentInput.substring(cursorIndex)
          }
          cursorIndex++
        } else {
          // Editing the radicand (after √)
          currentInput = currentInput.substring(0, cursorIndex) + digit + currentInput.substring(cursorIndex)
          cursorIndex++
        }

        updateDisplay()
        return
      }
      if (isFractionMode) {
        const pos = fractionCursorPos[activeFractionPart]
        const currentValue = fractionData[activeFractionPart]

        // Insert digit at cursor position
        fractionData[activeFractionPart] = currentValue.substring(0, pos) + digit + currentValue.substring(pos)

        // Move cursor forward
        fractionCursorPos[activeFractionPart]++

        renderFractionWithCursor()
      } else {
        insertAtCursor(digit)
      }
    }

    // Evaluation function
    function evaluateWithPEMDAS(expression) {
      // Enhanced implicit multiplication handling
      expression = expression.replace(/(\d+)(\()/g, "$1*$2") // 1000( → 1000*(
      expression = expression.replace(/(\))(\d+)/g, "$1*$2") // )500 → )*500
      expression = expression.replace(/(\))(\()/g, "$1*$2") // )( → )*(

      // Replace operators for JS
      expression = expression.replace(/×/g, "*").replace(/÷/g, "/")

      // Handle square roots
      expression = expression.replace(/√$$([^)]+)$$/g, "Math.sqrt($1)")

      // Handle exponents more carefully - process all exponents in the expression
      // First handle complex exponent cases with parentheses
      expression = expression.replace(/($$[^()]+$$)\^($$[^()]+$$)/g, "Math.pow($1,$2)")
      expression = expression.replace(/($$[^()]+$$)\^([\d.]+)/g, "Math.pow($1,$2)")
      expression = expression.replace(/([\d.]+)\^($$[^()]+$$)/g, "Math.pow($1,$2)")

      // Then handle simple number exponents - do this in a loop to catch all instances
      let prevExpression
      do {
        prevExpression = expression
        expression = expression.replace(/([\d.]+)\^([\d.]+)/g, "Math.pow($1,$2)")
      } while (prevExpression !== expression)

      try {
        // Use Function constructor to evaluate the expression safely
        // This ensures proper PEMDAS handling
        return new Function("return " + expression)()
      } catch (error) {
        console.error("Evaluation error:", error)
        return Number.NaN
      }
    }
    // Button event handlers
    // Number buttons
    jQuery(".number:not(#double-zero)").on("click", function () {
      const value = jQuery(this).text()
      handleDigitInput(value)
    })

    // Separate handler for double-zero
    // Double zero button
    jQuery("#double-zero").on("click", () => {
      if (isFractionMode) {
        const pos = fractionCursorPos[activeFractionPart]
        const currentValue = fractionData[activeFractionPart]

        // Insert 00 at cursor position
        fractionData[activeFractionPart] = currentValue.substring(0, pos) + "00" + currentValue.substring(pos)

        // Move cursor forward by 2
        fractionCursorPos[activeFractionPart] += 2

        renderFractionWithCursor()
      } else {
        insertAtCursor("00")
      }
    })

    // Find the decimal button click handler and replace it with this updated version
    // Decimal button
    jQuery("#decimal").on("click", () => {
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

      // Handle decimal in fraction mode
      if (isFractionMode) {
        // Check if the active part already has a decimal
        const parts = fractionData[activeFractionPart].split(/[+\-×÷^/()]/)
        const currentPart = parts[parts.length - 1]

        if (!currentPart.includes(".")) {
          const pos = fractionCursorPos[activeFractionPart]
          const currentValue = fractionData[activeFractionPart]

          // Insert decimal at cursor position
          fractionData[activeFractionPart] = currentValue.substring(0, pos) + "." + currentValue.substring(pos)

          // Move cursor forward
          fractionCursorPos[activeFractionPart]++

          renderFractionWithCursor()
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

    // Operation buttons
    jQuery("#add, #subtract, #multiply, #divide").on("click", function () {
      if (isSettingTaxRate || isMuMode) return

      const value = jQuery(this).text()

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
        default:
          operator = value
      }

      // If we're in fraction mode, add the operator to the active fraction part
      if (isFractionMode) {
        const pos = fractionCursorPos[activeFractionPart]
        const currentValue = fractionData[activeFractionPart]

        // Insert operator at cursor position
        fractionData[activeFractionPart] = currentValue.substring(0, pos) + operator + currentValue.substring(pos)

        // Move cursor forward
        fractionCursorPos[activeFractionPart]++

        renderFractionWithCursor()
        return
      }

      // If we just calculated a result, store the operation for repeat
      if (isCalculated) {
        lastOperation = operator
        lastValue = Number.parseFloat(currentInput)
      }

      insertAtCursor(operator)
    })

    // Exponent button
    jQuery("#exponent").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      // If we're in fraction mode, add the exponent symbol to the active fraction part
      if (isFractionMode) {
        const pos = fractionCursorPos[activeFractionPart]
        const currentValue = fractionData[activeFractionPart]

        // Insert ^ at cursor position
        fractionData[activeFractionPart] = currentValue.substring(0, pos) + "^" + currentValue.substring(pos)

        // Move cursor forward
        fractionCursorPos[activeFractionPart]++

        renderFractionWithCursor()
        return
      }

      // If we just calculated a result, store the operation for repeat
      if (isCalculated) {
        lastOperation = "^"
        lastValue = Number.parseFloat(currentInput)
      }

      insertAtCursor("^")
    })

    // Equals button
    jQuery("#equals").on("click", () => {
      if (isRootMode) {
        calculateRoot()
      } else if (isFractionMode) {
        calculateFraction()
      } else {
        calculate()
      }
      updateDisplay()
    })

    // Clear buttons
    jQuery("#on-c").on("click", () => {
      clearAll()
      openParenCount = 0
      updateParenIndicator()
    })

    jQuery("#ce").on("click", () => {
      clearEntry()
    })

    jQuery("#del").on("click", () => {
      deleteAtCursor()
    })

    // Sign change button
    jQuery("#plus-minus").on("click", () => {
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

      if (isFractionMode) {
        // Toggle sign of the active fraction part
        if (fractionData[activeFractionPart].startsWith("-")) {
          fractionData[activeFractionPart] = fractionData[activeFractionPart].substring(1)
          fractionCursorPos[activeFractionPart]--
        } else {
          fractionData[activeFractionPart] = "-" + fractionData[activeFractionPart]
          fractionCursorPos[activeFractionPart]++
        }
        renderFractionWithCursor()
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

    // Percent button
    jQuery("#percent").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      // Handle different contexts:
      if (isFractionMode) {
        // Handle percent in fraction mode
      } else if (lastOperation) {
        // Handle percent after operator (e.g., 100 + 10%)
        const value = (Number.parseFloat(currentInput) / 100) * lastValue
        currentInput = value.toString()
      } else {
        // Simple percentage
        const value = Number.parseFloat(currentInput) / 100
        currentInput = value.toString()
      }

      cursorIndex = currentInput.length
      updateDisplay()
    })

    // Add to calculator state variables
    // Add to calculator state variables at the top
    // Add to calculator state variables at the top
    let isRootMode = false
    let rootDegree = ""

    // Find the square root button handler and update it to support fraction mode
    jQuery("#square-root").on("click", () => {
      if (isSettingTaxRate || isMuMode || isViewingHistory) return

      // Handle square root in fraction mode
      if (isFractionMode) {
        const pos = fractionCursorPos[activeFractionPart]
        const currentValue = fractionData[activeFractionPart]

        // Insert square root symbol at cursor position
        fractionData[activeFractionPart] = currentValue.substring(0, pos) + "√(" + currentValue.substring(pos) + ")"

        // Move cursor to position after the opening parenthesis
        fractionCursorPos[activeFractionPart] = pos + 2

        renderFractionWithCursor()
        return
      }

      if (isRootMode) {
        // If already in root mode, calculate the root
        calculateRoot()
        return
      }

      // Enter root mode
      isRootMode = true

      // Use the current input as the radicand (value under root)
      const radicand = currentInput !== "0" && !isNaN(currentInput) ? currentInput : ""

      // Set up the display with default degree of 2 (square root)
      rootDegree = "2"
      currentInput = rootDegree + "√" + radicand
      cursorIndex = currentInput.indexOf("√") + 1 // Position cursor after the root symbol

      updateDisplay()
    })

    function calculateRoot() {
      try {
        // Get the degree (before √ symbol)
        const rootSymbolPos = currentInput.indexOf("√")
        const degree = currentInput.substring(0, rootSymbolPos)
        const degreeNum = degree ? Number.parseInt(degree) : 2

        // Get the radicand (after √ symbol)
        const radicand = currentInput.substring(rootSymbolPos + 1)
        const value = Number.parseFloat(radicand) || 0

        if (degreeNum === 0 || (degreeNum % 2 === 0 && value < 0)) {
          currentInput = "Error"
        } else {
          const result = Math.pow(value, 1 / degreeNum)
          currentInput = result.toString()

          history.push({
            equation: `${degreeNum}√${value}`,
            result: currentInput,
          })
        }
      } catch (error) {
        currentInput = "Error"
      }

      isRootMode = false
      rootDegree = ""
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    }
    // Fraction button

    // Memory functions
    jQuery("#rm-cm")
      .on("click", () => {
        if (isSettingTaxRate || isMuMode || isViewingHistory) return

        // Single click - recall memory
        if (memory !== 0) {
          currentInput = memory.toString()
          cursorIndex = currentInput.length
          updateDisplay()
        }
      })
      .on("dblclick", () => {
        // Double click - clear memory
        memory = 0
        $memoryIndicator.css("opacity", "0")
        if (currentInput === memory.toString()) {
          currentInput = "0"
          cursorIndex = 1
          updateDisplay()
        }
      })

    jQuery("#m-plus").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      if (isViewingHistory) {
        isViewingHistory = false
      }

      memory += Number.parseFloat(currentInput)
      $memoryIndicator.css("opacity", "1")
      isCalculated = true
    })

    jQuery("#m-minus").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      if (isViewingHistory) {
        isViewingHistory = false
      }

      memory -= Number.parseFloat(currentInput)
      $memoryIndicator.css("opacity", "1")
      isCalculated = true
    })

    // Tax functions
    jQuery("#tax").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      if (isViewingHistory) {
        isViewingHistory = false
      }

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
    })

    jQuery("#tax-plus").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      if (isViewingHistory) {
        isViewingHistory = false
      }

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
    })

    // Grand Total function
    jQuery("#gt").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      const value = Number.parseFloat(currentInput) || 0
      grandTotal += value

      // Round to 2 decimal places for monetary values
      currentInput = Math.round(grandTotal * 100) / 100 + ""
      cursorIndex = currentInput.length
      isCalculated = true
      updateDisplay()
    })

    // Add to clearAll():
    grandTotal = 0
    jQuery("#gt-indicator").css("opacity", "0")

    // Markup function
    jQuery("#mu").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      if (isViewingHistory) {
        isViewingHistory = false
      }

      enterMuMode()
    })

    // Review button
    jQuery("#rv").on("click", () => {
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

    // Parentheses buttons
    jQuery("#left-paren").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      if (isRootMode && currentInput.startsWith("√") && !currentInput.includes("(")) {
        currentInput = currentInput + "("
        cursorIndex = currentInput.length
        updateDisplay()
        return
      }
      // If we're in fraction mode, add the parenthesis to the active fraction part
      if (isFractionMode) {
        const pos = fractionCursorPos[activeFractionPart]
        const currentValue = fractionData[activeFractionPart]

        // Insert ( at cursor position
        fractionData[activeFractionPart] = currentValue.substring(0, pos) + "(" + currentValue.substring(pos)

        // Move cursor forward
        fractionCursorPos[activeFractionPart]++

        renderFractionWithCursor()

        // Update parentheses counter
        openParenCount++
        updateParenIndicator()
        return
      }

      insertAtCursor("(")
      openParenCount++
      updateParenIndicator()
    })

    jQuery("#right-paren").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      // If we're in fraction mode, add the parenthesis to the active fraction part
      if (isFractionMode) {
        const pos = fractionCursorPos[activeFractionPart]
        const currentValue = fractionData[activeFractionPart]

        // Insert ) at cursor position
        fractionData[activeFractionPart] = currentValue.substring(0, pos) + ")" + currentValue.substring(pos)

        // Move cursor forward
        fractionCursorPos[activeFractionPart]++

        renderFractionWithCursor()

        // Update parentheses counter
        if (openParenCount > 0) {
          openParenCount--
        }
        updateParenIndicator()
        return
      }

      insertAtCursor(")")
      if (openParenCount > 0) {
        openParenCount--
      }
      updateParenIndicator()
    })

    // Arrow key navigation
    jQuery("#left-arrow").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      if (isFractionMode) {
        // In fraction mode, move cursor within the active part
        if (fractionCursorPos[activeFractionPart] > 0) {
          fractionCursorPos[activeFractionPart]--
          renderFractionWithCursor()
        } else if (activeFractionPart === "denominator") {
          // If at the beginning of denominator, move to end of numerator
          activeFractionPart = "numerator"
          fractionCursorPos.numerator = fractionData.numerator.length
          renderFractionWithCursor()
        }
        return
      }

      if (cursorIndex > 0) {
        cursorIndex--
        updateDisplay()
      }
    })

    jQuery("#right-arrow").on("click", () => {
      if (isSettingTaxRate || isMuMode) return

      if (isFractionMode) {
        const currentPartLength = fractionData[activeFractionPart].length

        if (fractionCursorPos[activeFractionPart] < currentPartLength) {
          fractionCursorPos[activeFractionPart]++
          renderFractionWithCursor()
        } else if (activeFractionPart === "numerator") {
          // If at the end of numerator, move to beginning of denominator
          activeFractionPart = "denominator"
          fractionCursorPos.denominator = 0
          renderFractionWithCursor()
        }
        return
      }

      if (cursorIndex < currentInput.length) {
        cursorIndex++
        updateDisplay()
      }
    })

    jQuery("#up-arrow").on("click", () => {
      if (isFractionMode) {
        activeFractionPart = "numerator"
        renderFractionWithCursor()
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

    jQuery("#down-arrow").on("click", () => {
      if (isFractionMode) {
        activeFractionPart = "denominator"
        renderFractionWithCursor()
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

    jQuery("#tax").on("mousedown touchstart", () => {
      taxButtonPressed = true
      taxButtonTimer = setTimeout(() => {
        if (taxButtonPressed) {
          enterTaxRateMode()
          taxButtonPressed = false
        }
      }, 1000) // Long press for 1 second
    })

    jQuery("#tax").on("mouseup mouseleave touchend", () => {
      if (taxButtonTimer) {
        clearTimeout(taxButtonTimer)
      }
      taxButtonPressed = false
    })

    // Initial focus
    setTimeout(() => {
      if ($cursorPosition.length) {
        $cursorPosition.show()
      }
    }, 1000)

    // Remove the old cursor position element from the DOM since we're using inline cursors now
    if ($cursorPosition.length) {
      $cursorPosition.remove()
    }
  })
})(jQuery)
