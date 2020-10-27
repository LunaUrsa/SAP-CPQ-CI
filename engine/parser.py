import sys

def checkAheadForExceptions(checklist, locinlist, checkstring, numskip):
    returnbool = None
    testlist = ""
    lencheck = len(checkstring)

    for item in checklist[locinlist + numskip + 1:locinlist + numskip + lencheck + 1]:
        testlist += item

    if testlist.lower() == checkstring:
        returnbool = True

    return returnbool

def parseRawCode(rawText, returnoption):
    #logging.info("parseRawCode Initialized")
    #creates two lists (input -> raw code and output -> parsed code) and a string that the output will be written to at the end
    inputlist = []
    outputlist = []
    outputstring = ""
    #creates a location reference to enable refernces to the location while looping through the input string
    locref = 0
    #tracking list is the brain of the operation and will carry information on what tags/operators... etc. the loop is in - possible values are operator, tag, if, or assigntag
    trackinglist = []

    #logging.info("rawText : " + rawText)
    #logging.info("returnoption : " + str(returnoption))

    #cleans raw text of any newlines, tags or return carraiges
    rawText = rawText.replace("@@@", "").replace("~~~", "").replace("\r", "").strip()

    #logging.info("Stripped Raw Text : " + rawText)

    #appends each character in the raw text string to the input list making it easier to iterate through
    for chr in rawText:
        inputlist.append(chr)

    #this for loop iterates through each character in the input list and applies specific rules depending on the character
    for chr in inputlist:
        #logging.info(str(locref) + " - " + str(chr) + " - " + str(trackinglist))
        if chr == "(":
            try:
                if trackinglist[-1] == "operator" or trackinglist[-1] == "if" or trackinglist[-1] == "doctag":
                    #if a ( is encountered while in an operator, doctag, or an if statement it will add the (, then a new line, and indent to the proper depth
                    outputlist.append(chr)
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                else:
                    #if a ( is encountered and not in an operator, doctag, or if statement it will just directly add the (
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == ")":
            try:
                if trackinglist[-1] == "operator":
                    # if a ) is encountered while in an operator it will add the a new line,indent to the proper depth, add the ) and update the tracking list
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                    del trackinglist[-1]
                elif trackinglist[-1] == "if":
                    # if a ) is encountered while in an if statement it will add the a new line,indent to the proper depth, and then add the )
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                elif trackinglist[-1] == "assigntag":
                    # if a ) is encountered while in an if statement it will update tracking list, add the a new line,indent to the proper depth, and then add the )
                    del trackinglist[-1]
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                elif trackinglist[-1] == "doctag":
                    # if a ) is encountered while in a doctag it will update tracking list, add the a new line,indent to the proper depth, and then add the )
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == "<":
            try:
                #When a < is encountered it could indicate a tag or a doc tag. It checks if the next character is a < or a * and updates the tracking list accordingly
                if checkAheadForExceptions(inputlist, locref, "<", 0):
                    #if the doctag is the begining of the text string it won't add indents
                    if locref != 0:
                        outputlist.append("@@@")
                        addIndents(outputlist, trackinglist)
                        outputlist.append(chr)
                        trackinglist.append("doctag")
                    else:
                        outputlist.append(chr)
                        trackinglist.append("doctag")
                # This is the check for the * after, determines if it is a standard tag
                elif checkAheadForExceptions(inputlist, locref, "*", 0):
                    trackinglist.append("tag")
                    outputlist.append(chr)
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == ">":
            try:
                if trackinglist[-1] == "tag" and inputlist[locref - 1] == "*":
                    #> cues we are leaving a tag if we are in one. it updates the list and appends the >
                    del trackinglist[-1]
                    outputlist.append(chr)
                elif trackinglist[-1] == "doctag" and checkAheadForExceptions(inputlist, locref, ">", 0):
                    if inputlist[locref-1] != ")":
                        outputlist.append("@@@")
                        addIndents(outputlist, trackinglist)
                        outputlist.append(chr)
                    else:
                        outputlist.append(chr)
                    del trackinglist[-1]
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == "[":
            if checkAheadForExceptions(inputlist, locref, "if", 0):
                #Checks ahead in the input list for "if" and if it finds it then we know we are entering an if statement, updates tracking list, checks if it is already indented and if not then adds newline and tabs
                try:
                    if outputlist[-1] != "~~~":
                        outputlist.append("@@@")
                        addIndents(outputlist, trackinglist)
                        outputlist.append(chr)
                        trackinglist.append("if")
                    else:
                        trackinglist.append("if")
                        outputlist.append(chr)
                except IndexError:
                    trackinglist.append("if")
                    outputlist.append(chr)
            elif checkAheadForExceptions(inputlist, locref, "endif", 0):
                #checks ahead for "endif" and if it finds it then we are leaving an if statement, updates tracking list, newlines, adds indents, and appends [
                try:
                    del trackinglist[-1]
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                except IndexError:
                    outputlist.append(chr)
            elif checkAheadForExceptions(inputlist, locref, "condition", 0):
                trackinglist.append("conditiontag")
                outputlist.append(chr)
            else:
                #if we aren't starting an if statement then the [ indicates that we're entering an operator. updates tracking list and appends [
                trackinglist.append("operator")
                outputlist.append(chr)
        elif chr == "]":
            try:
                if trackinglist[-1] == "conditiontag":
                    del trackinglist[-1]
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == ",":
            try:
                if trackinglist[-1] == "operator" or trackinglist[-1] == "conditiontag" or trackinglist[-1] == "doctag":
                    #if in an operator, the , indicates that a new line, tabs, are to be added prior to the ,
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == ":":
            try:
                if trackinglist[-1] == "tag":
                    #Finding a : in a tag indicates that we are in a "assign tag" which triggers that a new line and tabs should be inserted after the :
                    del trackinglist[-1]
                    trackinglist.append("assigntag")
                    outputlist.append(chr)
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == "{":
            try:
                if trackinglist[-1] == "if":
                    #A { in an if statement indicates that either the then or else statement is triggered, so we add a newline and tabs after it
                    outputlist.append(chr)
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == "}":
            try:
                if trackinglist[-1] == "if":
                    # A { in an if statement indicates that either the then or else statement is finished, so we add a newline and tabs before it
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        elif chr == "=":
            try:
                #in condition or doctags ='s cause newlines/ indents
                if trackinglist[-1] == "conditiontag" or trackinglist[-1] == "doctag":
                    outputlist.append("@@@")
                    addIndents(outputlist, trackinglist)
                    outputlist.append(chr)
                else:
                    outputlist.append(chr)
            except IndexError:
                outputlist.append(chr)
        else:
            #if the characters are not anything "special" then we just append them to the output, this is the case for all of the else statements seen above too
            outputlist.append(chr)
        locref += 1

    if returnoption:
        outputlist.append("FORMATTED CODE PLEASE LET PAST")
        return str(outputlist)

def addIndents(outlist, tracklist):
    count = 0
    for cue in tracklist:
        if cue == "if" or cue == "operator" or cue == "assigntag" or cue == "doctag" or cue == "conditiontag":
            count += 1
            outlist.append("~~~")

rawCode = sys.argv[1]

if __name__ == "__main__":
    if len(rawCode) > 0:
        formattedCode = parseRawCode(rawCode, True)
        print(formattedCode)
        sys.stdout.flush()