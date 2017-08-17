package uk.ac.nactem.uima;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent;
import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuSentence;
import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuToken;

import org.apache.uima.UimaContext;
import org.apache.uima.analysis_component.JCasAnnotator_ImplBase;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.FSIndexRepository;
import org.apache.uima.cas.FSIterator;
import org.apache.uima.cas.FeatureStructure;
import org.apache.uima.cas.Type;
import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.cas.FSArray;
import org.apache.uima.jcas.tcas.Annotation;
import org.apache.uima.resource.ResourceInitializationException;

import uk.ac.nactem.bigm.MachineLearningUtils;
import uk.ac.nactem.bigm.MetaKnowledgeUtils;
import uk.ac.nactem.uima.cas.bionlpst.Attribute;
import uk.ac.nactem.uima.cas.bionlpst.Entity;
import uk.ac.nactem.uima.cas.bionlpst.Event;
import uk.ac.nactem.uima.cas.semantic.NamedEventParticipant;
import uk.ac.nactem.uima.ml.Instance;
import uk.ac.nactem.uima.ml.NameValuePair;

public class EventFeatureGenerator extends JCasAnnotator_ImplBase {

	private static final String eventType = "SeventType";

	private  String SEP  = ",";

	private ArrayList<String> eventTypes;

	private String prefix = "ev_";

	private Map<String,List<Attribute>> attributeMap;

	private boolean hasIncomingInstances;

	private ArrayList<String> featureVectorNames;
	private HashMap<String,String> features;

	public void initialize(UimaContext aContext) throws ResourceInitializationException {
		try {
			/* HOW TO ACCESS THE PATH TO A RESOURCE */
			eventTypes = fillClues(new File(aContext.getResourceFilePath(eventType)));
			initialiseFeatures();
		}
		catch (Exception e) {
			throw new ResourceInitializationException(e);
		}
	}


	private void initialiseFeatures() {
		featureVectorNames = new ArrayList<String>();
		features = new HashMap<String, String>();
		featureVectorNames.add("E0");
		features.put("E0","0");
		featureVectorNames.add("E1");
		features.put("E1", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("E2");
		features.put("E2", "0");
		featureVectorNames.add("E3");
		features.put("E3", "0");
		featureVectorNames.add("E4");
		features.put("E4", "0");
		featureVectorNames.add("E6");
		features.put("E6", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("E7");
		features.put("E7", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
	}

	public void process(JCas jcas) throws AnalysisEngineProcessException {
		ArrayList<ArrayList<String>> finFeatureVectors = new ArrayList<ArrayList<String>>();
		ArrayList<ArrayList<String>> finFeatureVectorNames = new ArrayList<ArrayList<String>>();

		ArrayList<Event> eventList = new ArrayList<Event>();
		int countSentence = 0; //to be used for E2 feature


		//  added the following to keep track of Attributes coming from gold standard data
		attributeMap = MetaKnowledgeUtils.populateAttributeMap(jcas, "");

		// RB: added the following to check for incoming Instances
		hasIncomingInstances = MachineLearningUtils.containsInstances(jcas);
		FSIterator<Annotation> sentenceIterator = jcas.getAnnotationIndex(EnjuSentence.type).iterator();

		while (sentenceIterator.hasNext()) {
			countSentence ++;
			HashMap<String, String> sentenceFeatures = new HashMap<String, String>(features);

			EnjuSentence sentence = (EnjuSentence) sentenceIterator.next();

			HashMap<String,EnjuToken> tokenMap = new HashMap<String,EnjuToken>();

			int E2;	
			E2 = countSentence; //will start from 1 not from 0
			sentenceFeatures.put("E2", Integer.toString(E2));
			// creates a tokenMap that holds all EnjuTokens of the sentence, identified by their begin-end offsets. It provides access-time O(1) 
			FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);

			while (tokenIterator.hasNext()) {
				EnjuToken token = (EnjuToken) tokenIterator.next();
				if(token.getEnd()!=0){
					String position = Integer.toString(token.getBegin()) + "_" + Integer.toString(token.getEnd());
					tokenMap.put(position, token);
				}
			}

			//Iterate over all events of the sentence and calculate the additional features
			FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

			while (eventIterator.hasNext()) {
				HashMap<String, String> eventFeatures = new HashMap<String, String>(sentenceFeatures);

				//Get event and event trigger EnjuTokens
				Event event = (Event) eventIterator.next();

				ArrayList<EnjuToken> triggers = getTriggerTokens(sentence, event, tokenMap, jcas);
				boolean participantsValid = true;
				FSArray participants = event.getParticipants();
				if (participants!=null) {
					for(int i = 0; i<participants.size(); i++){
						NamedEventParticipant participant = (NamedEventParticipant) participants.get(i);

						Annotation target = (Annotation) participant.getTarget();
						ArrayList<EnjuToken> partTokens ;
						if (target!=null){
							if(target.getType().getShortName().equals("Entity")){
								partTokens = getEntityTokens(sentence,(Entity)target, tokenMap, jcas);
								if(partTokens.isEmpty()){
									participantsValid = false;
								}
							}
							else if(target.getType().getShortName().equals("Event")){			
								partTokens = getTriggerTokens(sentence,(Event)target, tokenMap, jcas);
								if(partTokens.isEmpty()){
									participantsValid = false;
								}
							}
						}
						else{
							participantsValid = false;
						}
					}
				}
				else{
					participantsValid = false;
				}

				if(!triggers.isEmpty() ){
					eventFeatures = getEfeatures(event,triggers,sentence,E2,participantsValid,jcas, eventFeatures);

				}

				// write the features out to the CAS
				// make a new instance, which we will populate with data.
				Instance currentInstance = null;

				// we wrap this in a try catch statement, as checkInstance may cause
				// an error if no instance alreasy exists for the event
				System.out.println("Processing : "+ event.getId() + "with size : ");


				try
				{
					if(hasIncomingInstances){
						currentInstance = MetaKnowledgeUtils.checkInstance(jcas, event);
					}
					else{
						currentInstance = new Instance(jcas);
						// changed the lines below to instead get existing Attribute from the CAS;
						// since this is not a dimension-specific feature generator, this does not care about the 
						// attribute name

						if (event!=null) {
							List<Attribute> attributeList = attributeMap.get(event.getId());
							if (attributeList!=null && attributeList.size()>0) {
								currentInstance.setFeatureStructure(attributeList.get(0));
							}
							else {
								//create a new Attribute if none are found; means we are in classification mode
								Attribute attribute = new Attribute(jcas);
								attribute.setAnnotation(event);
								attribute.setAttributeName("Event");
								currentInstance.setFeatureStructure(attribute);
							}
							currentInstance.addToIndexes(jcas);
						}
					}


					List<NameValuePair> nameValuePairs = new ArrayList<NameValuePair>();

					// this will hold the "String Valued Vector" parameter
					FSArray fsArray = new FSArray(jcas, featureVectorNames.size());
					for (int index = 0; index < featureVectorNames.size(); index++)
					{
						NameValuePair instanceFeature = new NameValuePair(jcas);
						instanceFeature.setName("ev_"+featureVectorNames.get(index));
						instanceFeature.setValue(eventFeatures.get(featureVectorNames.get(index)));
						fsArray.set(index, instanceFeature);
						nameValuePairs.add(instanceFeature);
					} // for index

					MachineLearningUtils.appendFeatures(jcas, currentInstance, nameValuePairs);
				}//try
				catch(Exception e) {
					System.err.println("No instance for event with ID: " + event.getId());
				}

			}
		}
		transferToCAS(jcas, eventList, finFeatureVectors, finFeatureVectorNames);

	}




	private void transferToCAS(JCas jcas, ArrayList<Event> eventList, ArrayList<ArrayList<String>> finFeatureVectors, ArrayList<ArrayList<String>> finFeatureVectorNames) {

		if(finFeatureVectors.size()!=eventList.size()){
			System.out.println("Error: Feature vector size and event size do do match");
		}


		for(int j = 0; j<finFeatureVectors.size(); j++){
			//MS - 2015-9-16 - added try catch for exceptino from checkInstance

			try { 


				ArrayList<String> features = finFeatureVectors.get(j);
				ArrayList<String> featureNames = finFeatureVectorNames.get(j);

				if(features.size()!=featureNames.size()){
					System.out.println("Error: incompatible size of features and their names: "+features.size()+"-"+featureNames.size());
				}

				Instance currentInstance;

				if(hasIncomingInstances){
					currentInstance = MetaKnowledgeUtils.checkInstance(jcas, eventList.get(j));
				}
				else{
					currentInstance = new Instance(jcas);
					// changed the lines below to instead get existing Attribute from the CAS;
					// since this is not a dimension-specific feature generator, this does not care about the 
					// attribute name
					Event event = eventList.get(j);
					if (event!=null) {
						List<Attribute> attributeList = attributeMap.get(event.getId());
						if (attributeList!=null && attributeList.size()>0) {
							currentInstance.setFeatureStructure(attributeList.get(0));
						}
						else {
							//create a new Attribute if none are found; means we are in classification mode
							Attribute attribute = new Attribute(jcas);
							attribute.setAnnotation(event);
							attribute.setAttributeName("Event");
							currentInstance.setFeatureStructure(attribute);
						}
						currentInstance.addToIndexes(jcas);
					}
				}

				List<NameValuePair> featList= new ArrayList<NameValuePair>();

				for(int ind =0; ind<features.size(); ind++){
					String feature = features.get(ind);
					String featureName = featureNames.get(ind);
					NameValuePair instFeat = new NameValuePair(jcas);

					instFeat.setName(featureName);
					instFeat.setValue(feature);
					featList.add(instFeat);
				}

				MachineLearningUtils.appendFeatures(jcas, currentInstance, featList);
			}//try
			catch(Exception e) {
				System.err.println("No instance for event with ID: " + eventList.get(j));
			}
		}

	}

	private ArrayList<String> fillClues(File file) {
		ArrayList<String> clueList = new ArrayList<String>();
		try {
			BufferedReader reader = new BufferedReader(new FileReader(file));
			String line;
			while((line = reader.readLine())!=null){
				clueList.add(line);
			}
			reader.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return clueList;
	}



	//event is complex
	private int getE0(Event event, JCas jcas) {
		FSArray participants = event.getParticipants();
		if (participants!=null) {
			for (int i =0; i<participants.size(); i++){
				FeatureStructure feat = participants.get(i);
				if(feat.getType().getShortName().equals("NamedEventParticipant")){
					NamedEventParticipant nep = (NamedEventParticipant) feat;
					if(!nep.getTarget().getType().getShortName().equals("Entity")){
						return 1;
					}
				}
			}
		}
		return 0;
	}

	private HashMap<String, String> getEfeatures(Event event, ArrayList<EnjuToken> triggers, EnjuSentence sentence, int e2, boolean participantsValid, JCas jcas, HashMap<String, String> eventFeatures) {


		int E0;
		if(participantsValid) {
			E0 = getE0(event,jcas);
			eventFeatures.put("E0", Integer.toString(E0));
		}
		String eventType = event.getName();
		String E1 = getE1(eventType);
		if(E1.length()>0){
			eventFeatures.put("E1", E1);
		}
		eventFeatures.put("E2", Integer.toString(e2));
		int E3 = getE3(sentence, event, jcas);
		eventFeatures.put("E3", Integer.toString(E3));
		int E4 = 0;
		if(e2==1)
			E4 = getE4(sentence, event, jcas);
		eventFeatures.put("E4", Integer.toString(E4));
		int E6 = 0;
		if(E1.equals("neg_reg"))
			E6 = 1;
		eventFeatures.put("E6", Integer.toString(E6));

		int E7 = 0;
		if(E1.contains("reg"))
			E7 = 1;
		eventFeatures.put("E7", Integer.toString(E7));


		return eventFeatures;
	}


	private ArrayList<EnjuToken> getTriggerTokens(EnjuSentence sentence, Event event, HashMap<String, EnjuToken> tokenMap, JCas jcas) throws AnalysisEngineProcessException{

		ArrayList<EnjuToken> triggers = new ArrayList<EnjuToken> ();

		String lookupToken = Integer.toString(event.getBegin()) + "_" + Integer.toString(event.getEnd());
		EnjuToken triggerToken = tokenMap.get(lookupToken);
		if(triggerToken!=null)
			triggers.add(triggerToken);
		else{
			FSIterator<Annotation> triggerIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(event);
			while(triggerIterator.hasNext()){
				triggers.add((EnjuToken) triggerIterator.next());
			}
		}

		if (triggers.isEmpty()){
			Collection<EnjuToken> allTokens = tokenMap.values();
			for(EnjuToken token : allTokens){
				if(event.getBegin()>=token.getBegin() && event.getEnd()<=token.getEnd()){
					triggers.add(token);
				}
			}
		}
		/*if (triggers.isEmpty()){
			throw new AnalysisEngineProcessException(new Exception("Sentence : " + sentence.getCoveredText() + " - Event : " + event.getCoveredText()));
		}*/
		return triggers;

	}

	private ArrayList<EnjuToken> getEntityTokens(EnjuSentence sentence, Entity entity, HashMap<String, EnjuToken> tokenMap, JCas jcas){

		ArrayList<EnjuToken> entityTokens = new ArrayList<EnjuToken> ();

		String lookupToken = Integer.toString(entity.getBegin()) + "_" + Integer.toString(entity.getEnd());
		EnjuToken triggerToken = tokenMap.get(lookupToken);
		if(triggerToken!=null)
			entityTokens.add(triggerToken);
		else{
			FSIterator<Annotation> triggerIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(entity);
			while(triggerIterator.hasNext()){
				entityTokens.add((EnjuToken) triggerIterator.next());
			}
		}

		if (entityTokens.isEmpty()){
			Collection<EnjuToken> allTokens = tokenMap.values();
			for(EnjuToken token : allTokens){
				if(entity.getBegin()>=token.getBegin() && entity.getEnd()<=token.getEnd()){
					entityTokens.add(token);
				}
			}
		}
		return entityTokens;

	}

	//Sentence is NP (title)
	private int getE4(EnjuSentence sentence, Event event, JCas jcas) {
		FSIterator<Annotation> constIterator = jcas.getAnnotationIndex(EnjuConstituent.type).subiterator(sentence);
		while(constIterator.hasNext()){
			EnjuConstituent constituent = (EnjuConstituent) constIterator.next();
			if(constituent.getBegin() == sentence.getBegin() && constituent.getEnd()==sentence.getEnd()-1){
				if (constituent.getCat().equals("NP")){
					return 1;
				}
			}
		}
		return 0;
	}

	//Event is top level
	private int getE3(EnjuSentence sentence, Event event, JCas jcas) {
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);
		while (eventIterator.hasNext()){
			Event eventCandidate = (Event) eventIterator.next();
			FSArray participants = eventCandidate.getParticipants();
			if (participants!=null) {
				for (int i =0; i<participants.size(); i++){
					FeatureStructure feat = participants.get(i);
					if(feat.getType().getShortName().equals("NamedEventParticipant")){
						NamedEventParticipant nep = (NamedEventParticipant) feat;
						if(nep.getTarget().getType().getShortName().equals("Event")){
							Event eCandidate = (Event) nep.getTarget();
							if (eCandidate.equals(event)){
								return 0;
							}
						}
					}
				}
			}
		}
		return 1;
	}

	public String getE1(String et){
		String result = "";

		if(et.equalsIgnoreCase("regulation")){
			result = "reg";
		}
		else if(et.equalsIgnoreCase("positive_regulation")){
			result = "pos_reg";
		}
		else if(et.equalsIgnoreCase("negative_regulation")){
			result = "neg_reg";
		}
		else if(et.equalsIgnoreCase("binding")){
			result = "bin";
		}
		else if(et.equalsIgnoreCase("localization")){
			result = "loc";
		}
		else if(et.equalsIgnoreCase("gene_expression")){
			result = "exp";
		}
		else if(et.equalsIgnoreCase("correlation")){
			result = "cor";
		}
		else if(et.equalsIgnoreCase("transcription")){
			result = "tra";
		}
		else if(et.startsWith("Cell")){
			result = "cel";
		}
		else{
			result = "other";
		}
		return result;
	}






}
