#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
#import os, os.path
#import time
cgitb.enable()


#Applies generalized suffix trees to a list of sentences. Keeps values from the sentences
#Taken from Ben Langmead John Hopkings University
#Modified by Axel J. Soto University of Manchester
import re
import operator

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
                regexWords = re.compile(r'([!?,;:.&"-]+|\S*[A-Z]\.|\S*(?:[^!?,;:.\s&-]))',re.UNICODE)
                s += re.findall(regexWords,sentence)
            
            #if indexOfListOfSentences==0:
             #   self.root.out[s[0]] = self.Node(s,indexOfListOfSentences) # trie for just longest suf
            # add the rest of the suffixes, from longest to shortest
            
            if not(suffix):
                s.reverse()
            s.append(termSymbol)

            for i in xrange(0, len(s)):
                # start at root; we’ll walk down as far as we can go
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
                            # create “mid”: new node bisecting edge                            
                            mid = self.Node(lab[:k-j],child.sentenceIndex[:],cur.level+1)
                            mid.out[cNew] = self.Node(s[k:],[], mid.level+1)
                            # original child becomes mid’s child
                            mid.out[cExist] = child
                            # original child’s label is curtailed and level increased
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
            print "{} idx:{}".format(node.lab,node.sentenceIndex)
        for child in node.out:
            self.preorder(node.out[child], output)
            
    def postorder(self,node,output):
        for child in node.out:
            self.postorder(node.out[child], output)
        if node.lab != None:
            output.append(node)
            print node.lab
            
    def preorderWithPriority(self,node,output,sentencesPriority):
        #Sort based on the sum of priority
        for child in node.out:
            arrayOfPriorities = [sentencesPriority[x] for x in node.out[child].sentenceIndex ]
            node.out[child].priority = sum(arrayOfPriorities)/float(len(arrayOfPriorities))
        if node.lab != None:
            output.append(node)
            print "{} idsx:{}, priority: {}".format(node.lab,node.sentenceIndex,node.priority if hasattr(node, 'priority') else 0)
        
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
print sys.stdin
request = json.load(sys.stdin)


stree = SuffixTree(request['listOfSentences'],request['suffix'])

arrayPre=[]
stree.preorderWithGooglePriority(stree.followPath([request['word']])[0],arrayPre,request['listOfConfidence'])

    
cgi_result={}

cgi_result['preorderArray'] = arrayPre

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)