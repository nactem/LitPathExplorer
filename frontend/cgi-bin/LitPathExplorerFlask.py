from __future__ import print_function
from flask import Flask, url_for, json, request, Response
#from flask.ext.cors import CORS, cross_origin
import requests
import re
import operator
from time import gmtime, strftime
import csv
import pickle, os
import numpy as np

app = Flask(__name__)

#Necessary to catch pymongo exceptions
app.config['PROPAGATE_EXCEPTIONS'] = True
#Necessary to enable CORS
#app.config['CORS_HEADERS'] = 'Content-Type'

#cors = CORS(app, resources={r"/suffixprefixtree": {"origins": "*"},r"/saveNetwork":{"origins": "*"},r"/log":{"origins": "*"},r"/runNN":{"origins": "*"},r"/retrainNN":{"origins": "*"},r"/saveOverriddenEvents":{"origins": "*"},r"/readOverriddenEvents":{"origins": "*"}})


#=============================================================================
class SuffixTree(object):
    
    class Node(object):
        def __init__(self, lab,sentenceIdxs,level):
            self.lab = lab # label on path leading to this node
            self.sentenceIndex = sentenceIdxs #sentence indices on paths leading to this node
            self.out = {}  # outgoing edges; maps characters to nodes
            self.level = level  # distance from the root
    
    def __init__(self, listOfSentences,suffix):
        """ Make suffix tree, without suffix links, from listOfSentences in quadratic time
            and linear space (number of words per list compononent). List of sentences could be in turn composed of several 
            sentences """
        
        self.root = self.Node(None,None,0) #initialize roots
        termSymbol = '$'
        
        for indexOfListOfSentences, sentences in enumerate(listOfSentences):
            regexSentences = re.compile(r'\s*(.+?(?:[?!]+|$|\.(?=\s+[A-Z]|$)))\s*')
            sentencesSplit = re.findall(regexSentences,sentences)
            
            s=[]
            for sentence in sentencesSplit:
                #regexWords = re.compile(r'([!?,;:.&"-]+|\S*[A-Z]\.|\S*(?:[^!?,;:.\s&-]))')
                regexWords = re.compile(r'([!?,;:.&"-]+|\S*[A-Z]\.|\S*(?:[^!?,;:.\s&-]))',re.UNICODE)
                s += re.findall(regexWords,sentence)
            
            #if indexOfListOfSentences==0:
             #   self.root.out[s[0]] = self.Node(s,indexOfListOfSentences) # trie for just longest suf
            # add the rest of the suffixes, from longest to shortest
            
            if not(suffix):
                s.reverse()
            s.append(termSymbol)

            for i in xrange(0, len(s)):
                # start at root; we'll walk down as far as we can go
                cur = self.root
                j = i
                while j < len(s):
                    if s[j] in cur.out:
                        child = cur.out[s[j]]
                        lab = child.lab
                        # Walk along edge until we exhaust edge label or
                        # until we mismatch
                        k = j+1
                        while k-j < len(lab) and s[k] == lab[k-j]:
                            k += 1
                        if k-j == len(lab):
                            # we exhausted the edge
                            cur = child 
                            cur.sentenceIndex.append(indexOfListOfSentences)
                            j = k
                        else:
                            # we fell off in middle of edge
                            cExist, cNew = lab[k-j], s[k]
                            # create 'mid': new node bisecting edge                            
                            mid = self.Node(lab[:k-j],child.sentenceIndex[:],cur.level+1)
                            mid.out[cNew] = self.Node(s[k:],[], mid.level+1)
                            # original child becomes mid's child
                            mid.out[cExist] = child
                            # original child's label is curtailed and level increased
                            child.lab = lab[k-j:]
                            child.level = child.level + 1
                            # mid becomes new child of original parent
                            cur.out[s[j]] = mid
                    else:
                        # Fell off tree at a node: make new edge hanging off it
                        cur.out[s[j]] = self.Node(s[j:],[],cur.level+1)
                        #j = j + len(s[j:]) #advance index to position after the recently added edge label
    
    def followPath(self, s):
        """ Follow path given by s.  If we fall off tree, return None.  If we
            finish mid-edge, return (node, offset) where 'node' is child and
            'offset' is label offset.  If we finish on a node, return (node,
            None). """
        cur = self.root
        i = 0
        while i < len(s):
            c = s[i]
            if c not in cur.out:
                return (None, None) # fell off at a node
            child = cur.out[s[i]]
            lab = child.lab
            j = i+1
            while j-i < len(lab) and j < len(s) and s[j] == lab[j-i]:
                j += 1
            if j-i == len(lab):
                cur = child # exhausted edge
                i = j
            elif j == len(s):
                return (child, j-i) # exhausted query string in middle of edge
            else:
                return (None, None) # fell off in the middle of the edge
        return (cur, None) # exhausted query string at internal node
    
    def hasSubstring(self, s):
        """ Return true iff s appears as a substring """
        node, off = self.followPath(s)
        return node is not None
    
    def hasSuffix(self, s):
        """ Return true iff s is a suffix """
        node, off = self.followPath(s)
        if node is None:
            return False # fell off the tree
        if off is None:
            # finished on top of a node
            return '$' in node.out
        else:
            # finished at offset 'off' within an edge leading to 'node'
            return node.lab[off] == '$'
        
    def preorder(self,node,output):
        if node.lab != None:
            output.append(node)
            #print "{} idx:{}".format(node.lab,node.sentenceIndex)
        for child in node.out:
            self.preorder(node.out[child], output)
            
    def postorder(self,node,output):
        for child in node.out:
            self.postorder(node.out[child], output)
        if node.lab != None:
            output.append(node)
            #print node.lab
            
    def preorderWithPriority(self,node,output,sentencesPriority):
        #Sort based on the sum of priority
        for child in node.out:
            arrayOfPriorities = [sentencesPriority[x] for x in node.out[child].sentenceIndex ]
            node.out[child].priority = sum(arrayOfPriorities)/float(len(arrayOfPriorities))
        if node.lab != None:
            output.append(node)
            #print "{} idsx:{}, priority: {}".format(node.lab,node.sentenceIndex,node.priority if hasattr(node, 'priority') else 0)
        
        sortedChildren = sorted(node.out.items(), key=lambda x:x[1].priority,reverse=True)
        #sortedChildren = sorted(node.out, key=lambda k: k.priority, reverse = True) 
        for child in sortedChildren:
            self.preorderWithPriority(child[1], output,sentencesPriority)
            
    def preorderWithGooglePriority(self,node,output,sentencesPriority):
        self.assignGooglePriority(node,sentencesPriority)
        self.preorderWithGoogle(node,output)
    
    def assignGooglePriority(self,node,sentencesPriority):
        if not bool(node.out):#if leaf
            node.priority = sentencesPriority[node.sentenceIndex[0]]
        else:
            acum = []
            for child in node.out:
                self.assignGooglePriority(node.out[child],sentencesPriority)
                acum.append(node.out[child].priority)
            node.priority = sum(acum)/float(len(acum))
    
    def preorderWithGoogle(self, node, output):
        if node.lab != None:
            #output.append(node)
            #print "{} idsx:{}, priority: {}, level: {}".format(node.lab,node.sentenceIndex,node.priority, node.level)
            output.append({'words':node.lab,'level':node.level,'idsx':node.sentenceIndex,'priority':node.priority})
            
        sortedChildren = sorted(node.out.items(), key=lambda x:x[1].priority,reverse=True)
        #sortedChildren = sorted(node.out, key=lambda k: k.priority, reverse = True) 
        for child in sortedChildren:
            self.preorderWithGoogle(child[1], output)
        
#=============================================================================


@app.route('/')
def hello_world():
    return 'Hello, World!'
    
@app.route('/suffixprefixtree', methods = ['POST'])#, 'OPTIONS'])
#@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
#@crossdomain(origin='*')
def api_suffixprefixtree():
    dataFromJS = request.json
    
    stree = SuffixTree(dataFromJS['listOfSentences'],dataFromJS['suffix'])

    arrayPre=[]
    stree.preorderWithGooglePriority(stree.followPath([dataFromJS['word']])[0],arrayPre,dataFromJS['listOfConfidence'])

    cgi_result={}

    cgi_result['preorderArray'] = arrayPre

    #return output
    
    #js = json.dumps(elasticResponse.text)
    #js = elasticResponse.text
    #js = json.dumps({"a":1})
    flaskResp = Response(json.dumps(cgi_result), status=200, mimetype='application/json')
    return flaskResp 

@app.route('/saveNetwork', methods = ['POST'])#, 'OPTIONS'])
#@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
#@crossdomain(origin='*')
def api_saveNetwork():
    #get location of code
    here = os.path.dirname(__file__)
    subDirectory = 'savedNetworks'
    dataFromJS = request.json
    
    currentTimeStamp = strftime("%Y-%m-%d-%H-%M-%S", gmtime())
    fileName = 'exportData' + currentTimeStamp + '.csv'
    
    arrayOut=[]
    with open(os.path.join(here, subDirectory, fileName), 'wb') as csvfile:
        spamwriter = csv.writer(csvfile, delimiter=',')
        spamwriter.writerow(['Event normalised name', 'Event model element', 'Confidence value', 'Entity A normalised name', 'Entity A model element', 'Entity B normalised name', 'Entity B model element'])
        for row in dataFromJS:
            newRow = []
            for node in row:
                newRow.append(node['normalisedName'].encode("utf-8"))
                newRow.append(node['modelElement'].encode("utf-8"))
                if (node['tagName']=='Event'):
                    newRow.append(str(node['value']))
            spamwriter.writerow(newRow)

        
        
    cgi_result={}

    cgi_result['result'] = fileName

    
    flaskResp = Response(json.dumps(cgi_result), status=200, mimetype='application/json')
    return flaskResp 
    
@app.route('/log', methods = ['POST'])#, 'OPTIONS'])
#@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
#@crossdomain(origin='*')
def api_log():
    #get location of code
    here = os.path.dirname(__file__)
    subDirectory = 'savedLogs'
    
    dataFromJS = request.json
    
    currentTimeStamp = strftime("%Y-%m-%d-%H-%M-%S", gmtime())
    fileName = 'log' + str(dataFromJS['userId']) + '.log'

    with open(os.path.join(here, subDirectory, fileName), 'a') as logfile:
        logfile.write('Session:{5}, Operation:{0}, node: {1}, attributes:{2}, Old value:{3}, New value:{4}\n'.format(dataFromJS['operation'], dataFromJS['node'], dataFromJS['attributes'], dataFromJS['oldValue'], dataFromJS['newValue'], dataFromJS['session']))

    cgi_result={}

    cgi_result['result'] = fileName

    
    flaskResp = Response(json.dumps(cgi_result), status=200, mimetype='application/json')
    return flaskResp 

def nonlin(x,deriv=False):
    if(deriv==True):
        return x*(1-x)

    return 1/(1+np.exp(-x))

    
    
@app.route('/runNN', methods = ['POST'])#, 'OPTIONS'])
#@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
#@crossdomain(origin='*')
def runNN():
    #get location of code
    here = os.path.dirname(__file__)

    #set constants
    # path = './networks/'
    subDirectory = './networks/'
    initialName = 'nnWeights'
    
    dataFromJS = request.json
    
    matrix = []
    for node in dataFromJS['eventNodes']:
        #matrix.append([node['polarity'], node['nPapers'], node['altmetricPct'], node['languageCertainty'], node['impactFactor'], node['nCitations'],1]);
        matrix.append([node['nPapers'], node['altmetricPct'], node['languageCertainty'], node['impactFactor'], node['nCitations'],1]);
        
    #put it as numpy array
    X = np.array(matrix)
    
    userId = dataFromJS['userId']

    if (userId!= None) and (os.path.isfile(os.path.join(here, subDirectory, initialName + userId))):
        with open(os.path.join(here, subDirectory, initialName + userId),'rb') as f:
            weights = pickle.load(f)
            NNread = userId
    else:
        with open(os.path.join(here, subDirectory, initialName),'rb') as f:
            weights = pickle.load(f)
            NNread = 'initial'
        
    syn0, syn1 = weights

    pl1 =  nonlin(np.dot(X,syn0))
    pl2 =  nonlin(np.dot(pl1,syn1))
       
        
    cgi_result={}

    cgi_result['values'] = pl2.tolist()
    cgi_result['NNread'] = NNread;
    
    flaskResp = Response(json.dumps(cgi_result), status=200, mimetype='application/json')
    return flaskResp 
    
def sampleData(data,vector,classAN, classBN, sampleSize):
    #data: data to be sampled from
    #vector: target of data
    #number of instances in the first class (they are supposed to be at the beginning)
    #number of instances in the second class (they are supposed to be after the first class)
    indicesA = np.arange(classAN)
    np.random.shuffle(indicesA)
    indicesB = np.arange(classBN)
    np.random.shuffle(indicesB)
    
    if (classBN >= sampleSize):
        Xsamp = np.concatenate((data[indicesA[0:0 + sampleSize],:], data[indicesB[0:0 + sampleSize] + classAN,:]), axis = 0)
        ysamp = np.concatenate((vector[indicesA[0:0 + sampleSize],:], vector[indicesB[0:0 + sampleSize] + classAN,:]), axis = 0)
    else:
        # taking all from classB and compensating from classA
        Xsamp = np.concatenate((data[indicesA[0:0 + sampleSize + (sampleSize-classBN)],:], data[indicesB[0:0 + classBN] + classAN,:]), axis = 0)
        ysamp = np.concatenate((vector[indicesA[0:0 + sampleSize+ (sampleSize-classBN)],:], vector[indicesB[0:0 + classBN] + classAN,:]), axis = 0)
    
    return Xsamp, ysamp
    
def retrain(syn0,syn1, X, y, nLabeledData):
#nLabeledData contains the number of data instances that have been labeled and are at the end of X and y
    miniBatch = 100
    #train neural network
    for j in xrange(5000):

        # Feed forward through layers 0, 1, and 2
        Xsamp, ysamp = sampleData(X,y,len(y)-nLabeledData,nLabeledData,miniBatch)

        l0 = Xsamp
        l1 = nonlin(np.dot(l0,syn0))
        l2 = nonlin(np.dot(l1,syn1))

        # how much did we miss the target value?
        l2_error = ysamp - l2   

        # in what direction is the target value?
        # were we really sure? if so, don't change too much.
        l2_delta = l2_error*nonlin(l2,deriv=True) 

        # how much did each l1 value contribute to the l2 error (according to the weights)?

        l1_error = l2_delta.dot(syn1.T)

        # in what direction is the target l1?
        # were we really sure? if so, don't change too much.
        l1_delta = l1_error * nonlin(l1,deriv=True)  #* (0.1 if j>40000 else 1)
        #print l1_error
        #print nonlin(l1,deriv=True)
        #break

        syn1 += l1.T.dot(l2_delta)
        syn0 += l0.T.dot(l1_delta)
        #max_norm constraint
        #-compute norm2 for syn0 and syn1
        syn0_n = np.sqrt((syn0 * syn0).sum(axis=0))
        syn1_n = np.sqrt((syn1 * syn1).sum(axis=0))

        syn0 = 5 * (syn0 / syn0_n.transpose())
        syn1 = 5 * (syn1 / syn1_n)

    return syn0, syn1
    
@app.route('/retrainNN', methods = ['POST'])#, 'OPTIONS'])
#@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
#@crossdomain(origin='*')
def retrainNN():
    #get location of code
    here = os.path.dirname(__file__)

    #set constants
    # path = './networks/'
    subDirectory = 'networks'
    initialName = 'nnWeights'
    
    dataFromJS = request.json
    
    # reading matrix from nodes
    matrix = []
    vector = [];
    for node in dataFromJS['eventNodes']:
        #matrix.append([node['polarity'], node['nPapers'], node['altmetricPct'], node['languageCertainty'], node['impactFactor'], node['nCitations'],1]);
        matrix.append([node['nPapers'], node['altmetricPct'], node['languageCertainty'], node['impactFactor'], node['nCitations'],1]);
        if (np.isnan(node['value'])):
            value = 0
        elif abs(node['value'])>1:
            value = 0
        else:
            value = abs(node['value'])
        vector.append([value]);
        
    #put it as numpy array
    X = np.array(matrix)
    y = np.array(vector)
    nLabeledData = dataFromJS['nLabeledEvents']
    userId = dataFromJS['userId']

    if (userId!= None) and (os.path.isfile(os.path.join(here, subDirectory, initialName + userId))):
        with open(os.path.join(here, subDirectory, initialName + userId),'rb') as f:
            weights = pickle.load(f)
            NNread = userId
    else:
        with open(os.path.join(here, subDirectory, initialName ),'rb') as f:
            weights = pickle.load(f)
            NNread = 'initial'

        
    syn0, syn1 = weights

    syn0, syn1 = retrain(syn0,syn1, X, y, nLabeledData)   


    with open(os.path.join(here, subDirectory, initialName + userId),'wb') as f:
        pickle.dump((syn0, syn1), f)

    pl1 =  nonlin(np.dot(X,syn0))
    pl2 =  nonlin(np.dot(pl1,syn1))
        
    cgi_result={}

    cgi_result['values'] = pl2.tolist()
    cgi_result['NNread'] = NNread;
    
    flaskResp = Response(json.dumps(cgi_result), status=200, mimetype='application/json')
    return flaskResp 
    
    
@app.route('/saveOverriddenEvents', methods = ['POST'])#, 'OPTIONS'])
#@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
#@crossdomain(origin='*')
def saveOverriddenEvents():
    #get location of code
    here = os.path.dirname(__file__)

    #set constants
    #path = './overrides/'
    subDirectory = 'overrides'
    initialName = 'eventOverrides'

    #read data from JS
    dataFromJS = request.json
    userId = dataFromJS['userId']
    nodeId = dataFromJS['nodeId']
    value = dataFromJS['nodeValue']
    
    #check if user's data exists
    if (os.path.isfile(os.path.join(here, subDirectory, initialName + userId))):
        #read the user's file of overriden events
        with open(os.path.join(here, subDirectory, initialName + userId),'rb') as f:
            overriddenEvents = pickle.load(f)
            eventsRead = userId
    else:
        #start from an empty dict
        overriddenEvents = {}
        eventsRead = 'blank'

    # reading matrix from nodes
    overriddenEvents[nodeId] = value

    #save data to disk
    with open(os.path.join(here, subDirectory, initialName + userId),'wb') as f:
        pickle.dump(overriddenEvents, f)

    cgi_result={}

    cgi_result['eventsRead'] = eventsRead;
    
    flaskResp = Response(json.dumps(cgi_result), status=200, mimetype='application/json')
    return flaskResp 

@app.route('/readOverriddenEvents', methods = ['POST'])#, 'OPTIONS'])
#@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
#@crossdomain(origin='*')
def readOverriddenEvents():
    #get location of code
    here = os.path.dirname(__file__)
    
    #set constants
    #path = './overrides/'
    subDirectory = 'overrides'
    initialName = 'eventOverrides'    

    #read data from JS
    dataFromJS = request.json
    userId = dataFromJS['userId']
    
    
    #check if user's data exists
    if (userId!= None) and (os.path.isfile(os.path.join(here, subDirectory, initialName + userId))):
        #read the user's file of overriden events
        with open(os.path.join(here, subDirectory, initialName + userId),'rb') as f:
            overriddenEvents = pickle.load(f)
            eventsRead = userId
    else:
        #start from an empty dict
        overriddenEvents = {}
        eventsRead = 'blank'

    #turn overriden events into a list
    overriddenEventsList = []
    for key, value in overriddenEvents.iteritems():
        temp = {"id":key, "value": value}
        overriddenEventsList.append(temp)


    cgi_result={}

    cgi_result['overriddenEvents'] = overriddenEventsList;
    
    flaskResp = Response(json.dumps(cgi_result), status=200, mimetype='application/json')
    return flaskResp 
    
if __name__ == '__main__':
    #app.run(host='0.0.0.0', port=5002, threaded=True)
    app.run(threaded=True)