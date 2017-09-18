"""Generates necessary data for LitPathExplorer from an XMI formatted BioPAX model. The .XMI formatted model should be provided as a first parameter and the output filename as a second parameter. """

#import specific modules
import xml.etree.ElementTree as ET
import re
import json, sys

def addDictInfo(dictionary, key, value):
    if key in dictionary:
        dictionary[key].append(value)
    else:
        dictionary[key] = [value]

if len(sys.argv) != 3:
    sys.exit("The .XMI formatted model should be provided as a first parameter and the output filename as a second parameter")
else:
    xmiFileName = sys.argv[1]

#read xml file
try:
    tree = ET.parse(xmiFileName)
except Exception, e:
    sys.exit(".XMI file couldn't be parsed")

root = tree.getroot()

#Initialize data structures
nodeArray = []
linkArray = []
nodeXmiIdDict = {}
nodeIdDict = {}
dictNormalisedNames = {}
dictEventNormalisedNames = {}
dictEntityNormalisedNames = {}
dictLinkRoles = {}
dictEntityTagNames = {}
dictModelElement = {}

nodeIndex = -1

#define namespaces
ns = {'bigm':'http:///uk/ac/nactem/uima/bigm.ecore','xmi':'http://www.omg.org/XMI'}

iter = 0
for child in root:
    if re.search("^{" + ns['bigm'] + "}Event$", child.tag):
        iter = iter +1
        if iter%100==0:
            print 'Child processed: {}'.format(iter)
        #Filter events whose normalisedName is not HasMember
        if not re.search('^(HasMember)', child.attrib['normalisedName']):
            #One new node
            nodeIndex = nodeIndex + 1
            #This is an event node
            lastEventNodeIndex = nodeIndex

            #Properties of the event node
            normalisedName = child.attrib['normalisedName']
            matchObj = re.match('.*?}(.*)', child.tag)
            tagName = matchObj.group(1)
            xmi_id = child.attrib['{' + ns['xmi']+'}id']
            id = child.attrib['id']
            if xmi_id in nodeXmiIdDict:
                print xmi_id 
            else:
                nodeXmiIdDict[xmi_id] = nodeIndex
            if id in nodeIdDict:
                print id 
            else:
                nodeIdDict[id] = nodeIndex
            modelElement = child.attrib['modelElement']
            nodeArray.append({'normalisedName':normalisedName, 'tagName': tagName, 'connected': [], 'xmi_id': xmi_id, 'connectedLinkIndex':[], 'id':id, 'modelElement': modelElement})
            
            addDictInfo(dictNormalisedNames, normalisedName, nodeIndex)            
            addDictInfo(dictEventNormalisedNames, normalisedName, nodeIndex)            
            addDictInfo(dictModelElement, modelElement, nodeIndex)            

            #Get arguments
            argumentList = child.attrib['arguments'].split(' ')
            for arg in argumentList:
                for evArgs in root.findall("bigm:EventArgument[@xmi:id='"+ arg + "']", ns):
                    role = evArgs.attrib["role"]
                    if (role=='arg') or (role=='arg2'):
                        role = 'theme'
                    if (role=='arg1'):
                        role = 'agent'
                    #This works for "flattened" models where complex events are replaced by a complex participant. Checking in case it does not.
                    if re.search("^{" + ns['bigm'] + "}Event$", evArgs.tag):
                        print "Complex event!"
                        print lastEventNodeIndex
                    if evArgs.attrib["value"] in nodeXmiIdDict:
                        #the entity (or non-event node) appeared before with the same xmi:id
                        visitedIndex = nodeXmiIdDict[evArgs.attrib["value"]]
                                               
                        #add link information to the (entity) node
                        nodeArray[visitedIndex]['connected'].append(lastEventNodeIndex)
                        nodeArray[visitedIndex]['connectedLinkIndex'].append(len(linkArray))

                        #add link information to the event node
                        nodeArray[lastEventNodeIndex]['connected'].append(visitedIndex)
                        nodeArray[lastEventNodeIndex]['connectedLinkIndex'].append(len(linkArray))
                        
                        #Add link properties                        
                        linkArray.append({'source':lastEventNodeIndex,'target':visitedIndex,'role':role})
                        
                    else:
                        
                        for evArg in root.findall("*[@xmi:id='"+ evArgs.attrib["value"] + "']", ns):
                            #evArg is the entity connecting to the event (this loop only does one iteration)
                            
                            #While the xmi:id was not found we have to check if the id has been found before or not
                            #However, there are some entities with no id, so the modelElement is used as id (as a last resource)
                            identifier = 'id' if 'id' in evArg.attrib else 'modelElement'
                            
                            if evArg.attrib[identifier] in nodeIdDict:
                                #the entity (or non-event node) appeared before with the same id
                                visitedIndex = nodeIdDict[evArg.attrib[identifier]]
                                                       
                                #add link information to the (entity) node
                                nodeArray[visitedIndex]['connected'].append(lastEventNodeIndex)
                                nodeArray[visitedIndex]['connectedLinkIndex'].append(len(linkArray))

                                #add link information to the event node
                                nodeArray[lastEventNodeIndex]['connected'].append(visitedIndex)
                                nodeArray[lastEventNodeIndex]['connectedLinkIndex'].append(len(linkArray))
                                
                                #Add link properties                        
                                linkArray.append({'source':lastEventNodeIndex,'target':visitedIndex,'role':role})
                                
                                #create dictionary entries
                                addDictInfo(dictModelElement, evArg.attrib['modelElement'], visitedIndex) # different modelElement but same ids
                                
                            
                            else:
                                #One new node
                                nodeIndex = nodeIndex + 1
                                
                                #Properties of the non-event node
                                normalisedName = evArg.attrib['normalisedName']
                                matchObj = re.match('.*?}(.*)', evArg.tag)
                                tagName = matchObj.group(1)
                                id = evArg.attrib[identifier]
                                xmi_id = evArg.attrib['{' + ns['xmi']+'}id']
                                synonymList = []
                                modelElement = evArg.attrib['modelElement']
                                for syn in evArg.findall(".synonyms"):
                                    synonymList.append(syn.text)                        
                                
                                #create dictionary entries
                                nodeIdDict[evArg.attrib[identifier]] = nodeIndex
                                nodeXmiIdDict[evArgs.attrib["value"]] = nodeIndex
                                addDictInfo(dictNormalisedNames, normalisedName, nodeIndex)
                                addDictInfo(dictEntityNormalisedNames, normalisedName, nodeIndex)
                                addDictInfo(dictEntityTagNames, tagName, nodeIndex)
                                addDictInfo(dictLinkRoles, role, len(linkArray))
                                addDictInfo(dictModelElement, modelElement, nodeIndex)            
                                
                                nodeArray.append({'normalisedName':normalisedName, 'tagName': tagName, 'connected': [lastEventNodeIndex], 'xmi_id': xmi_id, 'id': id, 'synonyms': synonymList[:], 'connectedLinkIndex':[len(linkArray)], 'modelElement': modelElement})

                                #add link information to the eventnode
                                nodeArray[lastEventNodeIndex]['connected'].append(nodeIndex)
                                nodeArray[lastEventNodeIndex]['connectedLinkIndex'].append(len(linkArray))
                                
                                #Add link properties
                                linkArray.append({'source':lastEventNodeIndex,'target':nodeIndex,'role':role})
                                   

            
cgi_result={}

cgi_result['nodeArray'] = nodeArray
cgi_result['linkArray'] = linkArray
cgi_result['nodeIdDict'] = nodeIdDict
cgi_result['nodeXmiIdDict'] = nodeXmiIdDict
cgi_result['dictNormalisedNames'] = dictNormalisedNames
cgi_result['dictEntityNormalisedNames'] = dictEntityNormalisedNames
cgi_result['dictEventNormalisedNames'] = dictEventNormalisedNames
cgi_result['dictEntityTagNames'] = dictEntityTagNames
cgi_result['dictModelElement'] = dictModelElement
cgi_result['dictLinkRoles'] = dictLinkRoles

with open(sys.argv[2],'w') as f:
    json.dump(cgi_result, f)
