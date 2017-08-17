#!/usr/bin/python
# -*- coding: UTF-8 -*-

# Import modules for CGI handling 
import cgi, cgitb, json, sys
#import os, os.path
import pickle, os
import numpy as np

cgitb.enable()

def nonlin(x,deriv=False):
    if(deriv==True):
        return x*(1-x)

    return 1/(1+np.exp(-x))

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

path = './cgi-bin/networks/'
initialName = 'nnWeights'

dataFromJS = json.load(sys.stdin)

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

if (userId!= None) and (os.path.isfile(path + initialName + userId)):
    with open(path + initialName + userId,'rb') as f:
        weights = pickle.load(f)
        NNread = userId
else:
    with open(path + initialName,'rb') as f:
        weights = pickle.load(f)
        NNread = 'initial'

# with open('./cgi-bin/nnRetrainedWeights','rb') as f:
#    weights = pickle.load(f)
    
syn0, syn1 = weights

syn0, syn1 = retrain(syn0,syn1, X, y, nLabeledData)   


with open(path+initialName+userId,'wb') as f:
    pickle.dump((syn0, syn1), f)

pl1 =  nonlin(np.dot(X,syn0))
pl2 =  nonlin(np.dot(pl1,syn1))
    
cgi_result={}

cgi_result['values'] = pl2.tolist()
cgi_result['NNread'] = NNread;

print 'Content-Type: application/json\n\n'
print json.dumps(cgi_result)