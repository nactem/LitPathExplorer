package uk.ac.nactem.uima;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent;
import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuSentence;
import jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuToken;

import org.apache.uima.UimaContext;
import org.apache.uima.analysis_component.JCasAnnotator_ImplBase;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.FSIterator;
import org.apache.uima.cas.FeatureStructure;
import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.cas.FSArray;
import org.apache.uima.jcas.tcas.Annotation;
import org.apache.uima.resource.ResourceInitializationException;
import org.u_compare.shared.syntactic.SyntacticAnnotation;

import uk.ac.nactem.bigm.MachineLearningUtils;
import uk.ac.nactem.bigm.MetaKnowledgeUtils;
import uk.ac.nactem.uima.cas.bionlpst.Attribute;
import uk.ac.nactem.uima.cas.bionlpst.Entity;
import uk.ac.nactem.uima.cas.bionlpst.Event;
import uk.ac.nactem.uima.cas.semantic.NamedEventParticipant;
import uk.ac.nactem.uima.ml.Instance;
import uk.ac.nactem.uima.ml.NameValuePair;

public class UncertaintyFeatureGenerator extends JCasAnnotator_ImplBase {
	public static final String PARAM_SEP = "Sep";

	private static final String d0Arg1 = "Sd0Arg1Clues";
	private static final String d0Arg2 = "Sd0Arg2Clues";
	private static final String d1Arg2nt = "Sd1Arg2ntClues";
	private static final String all = "SallClues";


	private Map<String,List<Attribute>> attributeMap;
	private ArrayList<String> featureVectorNames;
	private HashMap<String,String> features;

	private boolean hasIncomingInstances;

	private ArrayList<String> d0Arg1Clues = new ArrayList<String>();
	private ArrayList<String> d0Arg2Clues = new ArrayList<String>();
	private ArrayList<String> d1Arg2ntClues = new ArrayList<String>();
	private ArrayList<String> allClues = new ArrayList<String>(); 


	public void initialize(UimaContext aContext) throws ResourceInitializationException {
		try {
			/* HOW TO ACCESS THE PATH TO A RESOURCE */
			d0Arg1Clues = fillClues(new File(aContext.getResourceFilePath(d0Arg1)));
			d0Arg2Clues = fillClues(new File(aContext.getResourceFilePath(d0Arg2)));
			d1Arg2ntClues = fillClues(new File(aContext.getResourceFilePath(d1Arg2nt)));
			allClues = fillClues(new File(aContext.getResourceFilePath(all)));


			initialiseFeatures();


		}
		catch (Exception e) {
			throw new ResourceInitializationException(e);
		}
	}


	private void initialiseFeatures() {
		featureVectorNames = new ArrayList<String>();
		features = new HashMap<String, String>();
		featureVectorNames.add("L0");
		features.put("L0","0");
		featureVectorNames.add("L1");
		features.put("L1","0");
		for (int i = 0; i < allClues.size(); i++){
			featureVectorNames.add("L1_" + allClues.get(i));
			features.put("L1_"+ allClues.get(i),"0");
		}
		featureVectorNames.add("L2");
		features.put("L2", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("L3");
		features.put("L3", "0");
		featureVectorNames.add("L4");
		features.put("L4", "0");
		featureVectorNames.add("L5");
		features.put("L5", "0");
		featureVectorNames.add("L6");
		features.put("L6", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("L7");
		features.put("L7", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("L8");
		features.put("L8", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("L9");
		features.put("L9", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("L10");
		features.put("L10", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("L11");
		features.put("L11", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
		featureVectorNames.add("D0Arg1");
		features.put("D0Arg1", "0");
		featureVectorNames.add("D0Arg2");
		features.put("D0Arg2", "0");
		featureVectorNames.add("D1Arg2nt");
		features.put("D1Arg2nt", "0");
		featureVectorNames.add("D0");
		features.put("D0", "0");
		featureVectorNames.add("D1");
		features.put("D1", "0");
		featureVectorNames.add("D2");
		features.put("D2", "0");
		featureVectorNames.add("D3");
		features.put("D3", "0");
		featureVectorNames.add("DD");
		features.put("DD", "100");
		featureVectorNames.add("C0");
		features.put("C0", "0");
		featureVectorNames.add("C1");
		features.put("C1", "0");
		featureVectorNames.add("C2");
		features.put("C2", "0");
		featureVectorNames.add("C3");
		features.put("C3", "0");
		featureVectorNames.add("C4");
		features.put("C4", "0");
		featureVectorNames.add("C5");
		features.put("C5", "0");
		featureVectorNames.add("C6");
		features.put("C6", "0");
	}

	/*public void process(JCas jcas) throws AnalysisEngineProcessException {

	}*/

	public void process(JCas jcas) throws AnalysisEngineProcessException {

		// RB: added the following to keep track of Attributes coming from gold
		// standard data
		attributeMap = MetaKnowledgeUtils.populateAttributeMap(jcas, "");

		hasIncomingInstances = MachineLearningUtils.containsInstances(jcas);


		FSIterator<Annotation> sentenceIterator = jcas.getAnnotationIndex(EnjuSentence.type).iterator();

		while (sentenceIterator.hasNext()) {
			HashMap<String, String> sentenceFeatures = new HashMap<String, String>(features);
			EnjuSentence sentence = (EnjuSentence) sentenceIterator.next();

			HashMap<String,EnjuToken> tokenMap = new HashMap<String,EnjuToken>();
			ArrayList<EnjuToken> sentenceClues = new ArrayList<EnjuToken>();

			//Multi-functional loop: 
			// 1) creates a tokenMap that holds all EnjuTokens of the sentence, identified by their begin-end offsets. It provides access-time O(1) 
			// 2) creates a list of clues found in that sentence (sentenceClues)
			// 3) it calculates features L1n, L9, L5 **this is done here to avoid looping over the tokens multiple times in order to calculate these features** 
			FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);

			while (tokenIterator.hasNext()) {
				EnjuToken token = (EnjuToken) tokenIterator.next();
				if(token.getEnd()!=0){
					String position = Integer.toString(token.getBegin()) + "_" + Integer.toString(token.getEnd());
					tokenMap.put(position, token);
					String word = token.getCoveredText();

					if(allClues.contains(token.getBase().toLowerCase())){
						sentenceFeatures.put("L1_"+token.getBase().toLowerCase(),"1");
						sentenceClues.add(token);
					}
					else if(word.contains("-")){
						for (String clueString : allClues){
							if (word.startsWith(clueString + "-") || word.endsWith("-" + clueString)){
								if(token.getAux()==null){
									sentenceFeatures.put("L9", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
								}
								else{
									sentenceFeatures.put("L9", token.getAux());
								}
							}
						}
					}
					sentenceFeatures.put("L9", MachineLearningUtils.DEFAULT_ATTRIBUTE_VALUE);
				}
			}
			//End of multi-functional loop

			//Calculate features  L1 and L5 : done here to avoid recalculating for each event
			if(!sentenceClues.isEmpty())
				sentenceFeatures.put("L1","1");

			sentenceFeatures.put("L5",Integer.toString(sentenceClues.size()));


			//Iterate over all events of the sentence and calculate the additional features
			FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

			while (eventIterator.hasNext()) {

				HashMap<String, String> eventFeatures = new HashMap<String, String>(sentenceFeatures);
				//Get event and event trigger EnjuTokens
				Event event = (Event) eventIterator.next();
				System.out.println("Processing : "+ event.getId() + "with size : ");

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
							System.out.println("STRANGE EVENT without valid participants : " + event.getId());
						}
					}
				}
				else{
					participantsValid = false;
				}
				if(!triggers.isEmpty() ){
					System.out.println("Processing : "+ event.getId() + "non empty trigger ");


					/// R features
					EnjuToken d0Arg1Clue = checkD0Arg1(event, jcas, d0Arg1Clues, sentence);
					EnjuToken d0Arg2Clue = checkD0Arg2(event, jcas, d0Arg2Clues, sentence);
					EnjuToken d1Arg2NTClue = checkD1Arg2NT(event, jcas, d1Arg2ntClues, sentence);

					if(d0Arg1Clue != null) 

						if(!(d0Arg1Clue.getBegin()==0 && d0Arg1Clue.getEnd()==0)){
							eventFeatures.put("D0Arg1","1");
						}

					if(d0Arg2Clue != null)
						if(!(d0Arg2Clue.getBegin()==0 && d0Arg2Clue.getEnd()==0)){
							eventFeatures.put("D0Arg2","1");
						}
					if(d1Arg2NTClue != null)
						if(!(d1Arg2NTClue.getBegin()==0 && d1Arg2NTClue.getEnd()==0)){
							eventFeatures.put("D1Arg2nt","1");
						}

					///D features

					EnjuToken d0Clue = getD0(event, jcas, allClues, sentence);
					EnjuToken d1Clue = getD1(event, jcas, allClues, sentence);
					EnjuToken d2Clue = getD2(event, jcas, allClues, sentence);
					EnjuToken d3Clue = getD3(event, jcas, allClues, sentence);

					if(!(d0Clue ==null || d1Clue ==null || d2Clue == null || d3Clue == null)){
						if(!(d0Clue.getBegin()==0 && d0Clue.getEnd()==0)){
							eventFeatures.put("D0","1");
						}

						if(!(d1Clue.getBegin()==0 && d1Clue.getEnd()==0)){
							eventFeatures.put("D1","1");
						}

						if(!(d2Clue.getBegin()==0 && d2Clue.getEnd()==0)){
							eventFeatures.put("D2","1");
						}

						if(!(d3Clue.getBegin()==0 && d3Clue.getEnd()==0)){
							eventFeatures.put("D3","1");
						}
					}

					///L features

					int optDist = Integer.MAX_VALUE;
					EnjuToken optClue = null; //optimal clue



					int eventPos = Integer.parseInt(triggers.get(0).getId().substring(1));

					//Calculate features L0 and L2 (avoided making a function just because I want to get both features in the same loop)
					for(EnjuToken clue : sentenceClues){
						int cluePos = Integer.parseInt(clue.getId().substring(1));
						int dist = eventPos-cluePos;
						if(Math.abs(dist) < Math.abs(optDist)){
							optDist = dist;
							optClue = clue;
						}
					}
					if(optDist < Integer.MAX_VALUE){
						eventFeatures.put("L0",Integer.toString(Math.abs(optDist)));

					}
					for(EnjuToken trigger : triggers){
						if(allClues.contains(trigger)){
							eventFeatures.put("L3","1");
						}
					}

					if(optDist > 0 && optDist < Integer.MAX_VALUE)
						eventFeatures.put("L4","1");

					if(optClue!=null){
						eventFeatures.put("L2", optClue.getBase().toLowerCase());
						if(optClue.getTense()!=null){
							eventFeatures.put("L6", optClue.getTense());
						}
						if(optClue.getAspect()!=null){
							eventFeatures.put("L7", optClue.getAspect());
						}
						if(optClue.getVoice()!=null){
							eventFeatures.put("L8", optClue.getVoice());
						}
						eventFeatures.put("L10", optClue.getPosString());

						if(optClue.getPosString().startsWith("V")){
							eventFeatures.put("L11", "V");
						}
						else if (optClue.getPosString().startsWith("N") || optClue.getPosString().startsWith("J")){
							eventFeatures.put("L11", "N");
						}
					}


					///C Features
					eventFeatures.put("C0", Integer.toString(getCtrigger("S", sentence, event, sentenceClues, triggers, jcas)));
					eventFeatures.put("C1", Integer.toString(getCarguments("S", sentence, event, sentenceClues, tokenMap, jcas)));
					eventFeatures.put("C2", Integer.toString(getCtrigger("VP", sentence, event, sentenceClues, triggers, jcas)));
					eventFeatures.put("C3", Integer.toString(getCarguments("VP", sentence, event, sentenceClues, tokenMap, jcas)));
					eventFeatures.put("C4", Integer.toString(getCtrigger("NP", sentence, event, sentenceClues, triggers, jcas)));
					eventFeatures.put("C5", Integer.toString(getCarguments("NP", sentence, event, sentenceClues, tokenMap, jcas)));
					eventFeatures.put("C6", Integer.toString(getScopesOver(sentence, event, sentenceClues, triggers, jcas)));


					///DD (Dependency Depth) Features
					eventFeatures.put("DD", Integer.toString(getDD0(event, sentence, tokenMap, sentenceClues, jcas)));

				}

				// write the features out to the CAS
				// make a new instance, which we will populate with data.
				Instance instance = null;

				// we wrap this in a try catch statement, as checkInstance may cause
				// an error if no instance alreasy exists for the event
				System.out.println("Processing : "+ event.getId() + "with size : ");

				try
				{

					if (hasIncomingInstances)
					{
						// get the correct instance for this event.
						instance = MetaKnowledgeUtils.checkInstance(jcas, event);
					} // if

					// if instance is null, then no instance relating to this event
					// existed,
					// so create a new instance to populate
					if (instance == null)
					{
						instance = new Instance(jcas);

						// push this feature structure to the CAS
						instance.addToIndexes(jcas);

					}

					// set the label of the instance to be the KT
					Attribute uncertaintyAttribute = null;

					// RB: changes to reduce iterations
					List<Attribute> attributeList = attributeMap.get(event.getId());
					if (attributeList != null && attributeList.size()>0)
					{
						for (Attribute attribute : attributeList)
						{
							if (attribute.getAttributeName().equals("Uncertainty"))
							{
								uncertaintyAttribute = attribute;
								break;
							}
						}
						if (uncertaintyAttribute==null) {
							// none of the existing Attributes is named Uncertainty; we are in classification mode 
							uncertaintyAttribute = new Attribute(jcas);
							uncertaintyAttribute.setAnnotation(event);
							uncertaintyAttribute.setAttributeName("Uncertainty");
							instance.setFeatureStructure(uncertaintyAttribute);

						}
					}
					else{
						System.out.println("No attribute list found");
					}

					// if the value of ktAttribute is null, then no relevant attribute was
					// found. So deal with this appropriately

					if (uncertaintyAttribute == null)
					{
						System.err.println(
								"could not find a value for the Uncertainty of event: " + event.getId());
						instance.setLabel("undefined");

						// if attribute != null and size > 0

						//create a new Attribute if none are found; means we are in classification mode
						uncertaintyAttribute = new Attribute(jcas);
						uncertaintyAttribute.setAnnotation(event);
						uncertaintyAttribute.setAttributeName("Uncertainty");
						instance.setFeatureStructure(uncertaintyAttribute);

					} 
					else{
						instance.setLabel(uncertaintyAttribute.getAttributeValue());

						// set the feature structure to which this annotation is attached
						instance.setFeatureStructure(uncertaintyAttribute);
					}

					uncertaintyAttribute.addToIndexes(jcas);

					List<NameValuePair> nameValuePairs = new ArrayList<NameValuePair>();

					// this will hold the "String Valued Vector" parameter
					FSArray fsArray = new FSArray(jcas, featureVectorNames.size());
					for (int index = 0; index < featureVectorNames.size(); index++)
					{
						NameValuePair instanceFeature = new NameValuePair(jcas);
						instanceFeature.setName("un_"+featureVectorNames.get(index));
						instanceFeature.setValue(eventFeatures.get(featureVectorNames.get(index)));
						fsArray.set(index, instanceFeature);
						nameValuePairs.add(instanceFeature);
					} // for index

					// add the features to the array
					// We add these to stringValuedVector as this is the only vector that
					// is expecting elements of type nameValuePair
					System.out.println("Set fv for : "+ event.getId() + "with size : " + nameValuePairs.size());
					MachineLearningUtils.appendFeatures(jcas, instance, nameValuePairs);
				} // try
				catch (Exception e)
				{
					e.printStackTrace();
				}


			}
		}

		//	transferToCAS(jcas, eventList, finFeatureVectors, finFeatureVectorNames, finLabels);

	}


	//R1	d0Arg1
	private EnjuToken checkD0Arg1(Event event, JCas jcas, ArrayList<String> d0Arg1List, EnjuSentence sentence){
		EnjuToken d0Arg1Clue = new EnjuToken(jcas);
		/*
			String sID = sentence.getId();
			String trigger = event.getCoveredText();		
			String eventType = event.getName();
			String eID = event.getId();
			boolean polarity = event.getNegation();
			System.out.println(sID + "\t" + eID + "\t" + trigger + "\t" + eventType + "\t" + polarity);
		 */
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken currToken = (EnjuToken) tokenIterator.next();
			String tString = currToken.getBase();
			for(int i=0; i<d0Arg1List.size(); ++i){
				String currClue = d0Arg1List.get(i);
				if(tString.equalsIgnoreCase(currClue)){
					//System.out.println("Clue found in sentence: " + currToken.getId());
					SyntacticAnnotation arg1Node = currToken.getArg1();	
					if(!(arg1Node == null)){
						if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
							d0Arg1Clue = currToken;
						}
					}
				}
			}//for

		}//while tokenIterator

		return d0Arg1Clue;
	}

	//R2	d0Arg2
	private EnjuToken checkD0Arg2(Event event, JCas jcas, ArrayList<String> d0Arg2List, EnjuSentence sentence){
		EnjuToken d0Arg2Clue = new EnjuToken(jcas);
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken currToken = (EnjuToken) tokenIterator.next();
			String tString = currToken.getBase();
			for(int i=0; i<d0Arg2List.size(); ++i){
				String currClue = d0Arg2List.get(i);
				if(tString.equalsIgnoreCase(currClue)){
					SyntacticAnnotation arg2Node = currToken.getArg2();	
					if(!(arg2Node == null)){
						if(semHeadMatches(jcas, arg2Node, triggerBegin, triggerEnd)){
							d0Arg2Clue = currToken;
						}
					}
				}
			}//for

		}//while tokenIterator

		return d0Arg2Clue;
	}

	//R3	d1Arg2NT
	private EnjuToken checkD1Arg2NT(Event event, JCas jcas, ArrayList<String> d1Arg2NTList, EnjuSentence sentence){
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		EnjuToken d1Arg2NTClue = new EnjuToken(jcas);
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken currToken = (EnjuToken) tokenIterator.next();
			String tString = currToken.getBase();
			for(int i=0; i<d1Arg2NTList.size(); ++i){
				String currClue = d1Arg2NTList.get(i);
				if(tString.equalsIgnoreCase(currClue)){
					SyntacticAnnotation arg2Node = currToken.getArg2();	
					if(!(arg2Node == null)){
						if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
							EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
							EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
							if(semHeadToken==null){
								return null;
							}
							boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
							if(!semHeadIsATrigger){
								SyntacticAnnotation secondArg2Node = semHeadToken.getArg2();
								if(semHeadMatches(jcas, secondArg2Node, triggerBegin, triggerEnd)){
									d1Arg2NTClue = currToken;
								}
							}//if semHead is not a trigger
						}		
					}

				}// if clue found
			}//for d1Arg2NTList

		}//while tokenIterator

		return d1Arg2NTClue;
	}

	/*//R4	d1Arg2
	private EnjuToken checkD1Arg2(Event event, JCas jcas, ArrayList<String> d1Arg2List, EnjuSentence sentence, FSIterator<Annotation> eventIterator){
		EnjuToken d1Arg2Clue = new EnjuToken(jcas);
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken currToken = (EnjuToken) tokenIterator.next();
			String tString = currToken.getBase();
			for(int i=0; i<d1Arg2List.size(); ++i){
				String currClue = d1Arg2List.get(i);
				if(tString.equalsIgnoreCase(currClue)){
					SyntacticAnnotation arg2Node = currToken.getArg2();	
					if(!(arg2Node == null)){
						if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
							EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
							EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
							if(semHeadToken==null){
								return null;
							}
							SyntacticAnnotation secondArg2Node = semHeadToken.getArg2();
							if(semHeadMatches(jcas, secondArg2Node, triggerBegin, triggerEnd)){
								d1Arg2Clue = currToken;
							}
						}		
					}

				}// if clue found
			}//for d1Arg2NTList

		}//while tokenIterator

		return d1Arg2Clue;
	}*/

	// D0	d0Clue	anyDepndencyRelation(anyClue, trigger)
	private EnjuToken getD0(Event event, JCas jcas, ArrayList<String> allClues, EnjuSentence sentence){
		//FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		EnjuToken d0Clue = new EnjuToken(jcas);
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken currToken = (EnjuToken) tokenIterator.next();
			String tString = currToken.getBase();
			for(int i=0; i<allClues.size(); ++i){
				String currClue = allClues.get(i);
				if(tString.equalsIgnoreCase(currClue)){
					//System.out.println("Clue found in sentence: " + currToken.getId());
					SyntacticAnnotation arg1Node = currToken.getArg1();	
					if(!(arg1Node == null)){
						if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
							//System.out.println("Clue: " + currToken.getCoveredText() + "\tTrigger: " + event.getCoveredText() + "\tAeg1Node: " + arg1Node.getCoveredText());
							d0Clue = currToken;
						}
					}

					SyntacticAnnotation arg2Node = currToken.getArg2();
					if(!(arg2Node==null)){
						if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
							//System.out.println("Clue: " + currToken.getCoveredText() + "\tAeg2Node: " + arg2Node.getCoveredText());
							d0Clue = currToken;
						}
					}

					SyntacticAnnotation modNode = currToken.getMod();	
					if(!(modNode == null)){
						if(semHeadMatches(jcas, arg1Node, triggerBegin, triggerEnd)){
							//System.out.println("Clue: " + currToken.getCoveredText() + "\tmodNode: " + modNode.getCoveredText());
							d0Clue = currToken;
						}
					}

				}
			}//for

		}//while tokenIter

		return d0Clue;
	}

	// D1  d1Clue anyDepndencyRelation(anyClue, anyParticipant)

	private EnjuToken getD1(Event event, JCas jcas, ArrayList<String> allClues, EnjuSentence sentence){

		EnjuToken d1Clue = new EnjuToken(jcas);
		FSArray partcipants = event.getParticipants();
		ArrayList<Integer> partcipantBegins = new ArrayList<Integer>();
		ArrayList<Integer> partcipantEnds = new ArrayList<Integer>();
		if (partcipants!=null) {
			for(int i=0; i<partcipants.size(); ++i){
				NamedEventParticipant participant = (NamedEventParticipant) partcipants.get(i);
				Annotation target = (Annotation) participant.getTarget();
				if(!target.getClass().getName().equalsIgnoreCase("uk.ac.nactem.uima.cas.bionlpst.Event")){
					partcipantBegins.add(target.getBegin());
					partcipantEnds.add(target.getEnd());
				}
			}
		}
		if(partcipantBegins.size()==partcipantEnds.size()){
			FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
			while (tokenIterator.hasNext()){
				EnjuToken currToken = (EnjuToken) tokenIterator.next();
				String tString = currToken.getBase();
				for(int i=0; i<allClues.size(); ++i){
					String currClue = allClues.get(i);
					if(tString.equalsIgnoreCase(currClue)){
						//System.out.println("Clue found in sentence: " + currToken.getId());
						SyntacticAnnotation arg1Node = currToken.getArg1();   
						if(!(arg1Node == null)){
							if(semHeadMatches(jcas, arg1Node, partcipantBegins, partcipantEnds)){
								d1Clue = currToken;
							}
						}

						SyntacticAnnotation arg2Node = currToken.getArg2();   
						if(!(arg2Node == null)){
							if(semHeadMatches(jcas, arg1Node, partcipantBegins, partcipantEnds)){
								d1Clue = currToken;
							}
						}

						SyntacticAnnotation modNode = currToken.getMod();     
						if(!(modNode == null)){
							if(semHeadMatches(jcas, arg1Node, partcipantBegins, partcipantEnds)){
								d1Clue = currToken;
							}
						}
					}
				}//for
			}//while tokenIter
		}
		else{
			System.out.println("The size of lists partcipantBegins and partcipantEnds is not excatly the same");
		}

		return d1Clue;
	}


	// D2	d2Clue	anyDepndencyRelation((anyClue, X) && (X, trigger)) 
	private EnjuToken getD2(Event event, JCas jcas, ArrayList<String> allClues, EnjuSentence sentence){
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);

		EnjuToken d2Clue = new EnjuToken(jcas);
		int triggerBegin = event.getBegin();
		int triggerEnd = event.getEnd();

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while (tokenIterator.hasNext()){
			EnjuToken currToken = (EnjuToken) tokenIterator.next();
			String tString = currToken.getBase();
			for(int i=0; i<allClues.size(); ++i){
				String currClue = allClues.get(i);
				if(tString.equalsIgnoreCase(currClue)){
					SyntacticAnnotation arg1Node = currToken.getArg1();	
					if(!(arg1Node == null)){
						if(arg1Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
							EnjuConstituent arg1NodeEC = (EnjuConstituent) arg1Node;
							EnjuToken semHeadToken = getSemHeadToken(arg1NodeEC, jcas);
							if(semHeadToken==null){
								return null;
							}
							boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
							if(!semHeadIsATrigger){
								SyntacticAnnotation xArg1Node = semHeadToken.getArg1();
								if(semHeadMatches(jcas, xArg1Node, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
								SyntacticAnnotation xArg2Node = semHeadToken.getArg2();
								if(semHeadMatches(jcas, xArg2Node, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
								SyntacticAnnotation xModNode = semHeadToken.getMod();
								if(semHeadMatches(jcas, xModNode, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
							}//if semHead is not a trigger
						}		
					}
					SyntacticAnnotation arg2Node = currToken.getArg2();	
					if(!(arg2Node == null)){
						if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
							EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
							EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
							if(semHeadToken==null){
								return null;
							}
							boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
							if(!semHeadIsATrigger){
								SyntacticAnnotation xArg1Node = semHeadToken.getArg1();
								if(semHeadMatches(jcas, xArg1Node, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
								SyntacticAnnotation xArg2Node = semHeadToken.getArg2();
								if(semHeadMatches(jcas, xArg2Node, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
								SyntacticAnnotation xModNode = semHeadToken.getMod();
								if(semHeadMatches(jcas, xModNode, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
							}//if semHead is not a trigger
						}		
					}
					SyntacticAnnotation modNode = currToken.getArg2();	
					if(!(modNode == null)){
						if(modNode.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
							EnjuConstituent modNodeEC = (EnjuConstituent) modNode;
							EnjuToken semHeadToken = getSemHeadToken(modNodeEC, jcas);
							if(semHeadToken==null){
								return null;
							}
							boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
							if(!semHeadIsATrigger){
								SyntacticAnnotation xArg1Node = semHeadToken.getArg1();
								if(semHeadMatches(jcas, xArg1Node, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
								SyntacticAnnotation xArg2Node = semHeadToken.getArg2();
								if(semHeadMatches(jcas, xArg2Node, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
								SyntacticAnnotation xModNode = semHeadToken.getMod();
								if(semHeadMatches(jcas, xModNode, triggerBegin, triggerEnd)){
									d2Clue = currToken;
								}
							}//if semHead is not a trigger
						}		
					}

				}
			}//for

		}//while tokenIter

		return d2Clue;
	}

	// D3	d2Clue	anyDepndencyRelation((anyClue, X) && (X, anyParticipant)) 
	private EnjuToken getD3(Event event, JCas jcas, ArrayList<String> allClues, EnjuSentence sentence){
		FSIterator<Annotation> eventIterator = jcas.getAnnotationIndex(Event.type).subiterator(sentence);
		EnjuToken d3Clue = new EnjuToken(jcas);
		FSArray partcipants = event.getParticipants();
		ArrayList<Integer> partcipantBegins = new ArrayList<Integer>();
		ArrayList<Integer> partcipantEnds = new ArrayList<Integer>();
		if (partcipants!=null) {
			for(int i=0; i<partcipants.size(); ++i){
				NamedEventParticipant participant = (NamedEventParticipant) partcipants.get(i);
				Annotation target = (Annotation) participant.getTarget();
				partcipantBegins.add(target.getBegin());
				partcipantEnds.add(target.getEnd());
				//System.out.println(event.getId() + "\t" + target.getCoveredText());
			}
		}
		if(partcipantBegins.size()==partcipantEnds.size()){
			FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
			while (tokenIterator.hasNext()){
				EnjuToken currToken = (EnjuToken) tokenIterator.next();
				String tString = currToken.getBase();
				for(int i=0; i<allClues.size(); ++i){
					String currClue = allClues.get(i);
					if(tString.equalsIgnoreCase(currClue)){
						SyntacticAnnotation arg1Node = currToken.getArg1();	
						if(!(arg1Node == null)){
							if(arg1Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
								EnjuConstituent arg1NodeEC = (EnjuConstituent) arg1Node;
								EnjuToken semHeadToken = getSemHeadToken(arg1NodeEC, jcas);
								if(semHeadToken==null){
									return null;
								}
								boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
								if(!semHeadIsATrigger){
									SyntacticAnnotation xArg1Node = semHeadToken.getArg1();
									if(semHeadMatches(jcas, xArg1Node, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
									SyntacticAnnotation xArg2Node = semHeadToken.getArg2();
									if(semHeadMatches(jcas, xArg2Node, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
									SyntacticAnnotation xModNode = semHeadToken.getMod();
									if(semHeadMatches(jcas, xModNode, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
								}//if semHead is not a trigger
							}		
						}
						SyntacticAnnotation arg2Node = currToken.getArg2();	
						if(!(arg2Node == null)){
							if(arg2Node.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
								EnjuConstituent arg2NodeEC = (EnjuConstituent) arg2Node;
								EnjuToken semHeadToken = getSemHeadToken(arg2NodeEC, jcas);
								if(semHeadToken==null){
									return null;
								}
								boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
								if(!semHeadIsATrigger){
									SyntacticAnnotation xArg1Node = semHeadToken.getArg1();
									if(semHeadMatches(jcas, xArg1Node, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
									SyntacticAnnotation xArg2Node = semHeadToken.getArg2();
									if(semHeadMatches(jcas, xArg2Node, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
									SyntacticAnnotation xModNode = semHeadToken.getMod();
									if(semHeadMatches(jcas, xModNode, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
								}//if semHead is not a trigger
							}		
						}
						SyntacticAnnotation modNode = currToken.getArg2();	
						if(!(modNode == null)){
							if(modNode.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
								EnjuConstituent modNodeEC = (EnjuConstituent) modNode;
								EnjuToken semHeadToken = getSemHeadToken(modNodeEC, jcas);
								if(semHeadToken==null){
									return null;
								}
								boolean semHeadIsATrigger = isATrigger(semHeadToken, eventIterator);
								if(!semHeadIsATrigger){
									SyntacticAnnotation xArg1Node = semHeadToken.getArg1();
									if(semHeadMatches(jcas, xArg1Node, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
									SyntacticAnnotation xArg2Node = semHeadToken.getArg2();
									if(semHeadMatches(jcas, xArg2Node, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
									SyntacticAnnotation xModNode = semHeadToken.getMod();
									if(semHeadMatches(jcas, xModNode, partcipantBegins, partcipantEnds)){
										d3Clue = currToken;
									}
								}//if semHead is not a trigger
							}		
						}

					}
				}//for

			}//while tokenIter
		}//if partcipantBegin and partcipantEnd have the same size 

		return d3Clue;
	}

	//Helper Method: Follows the route of semantic head constituents and returns the final semantic head (EnjuToken) for the given EnjuConstituent
	private EnjuToken getSemHeadToken(EnjuConstituent ec, JCas jcas){
		EnjuToken semHeadToken = new EnjuToken(jcas);
		Annotation semHead = ec.getSemHead();
		if(semHead!=null){
			if(semHead.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuToken")){
				semHeadToken = (EnjuToken) semHead;
			}
			else{
				EnjuConstituent semHeadEC = (EnjuConstituent) semHead;
				semHeadToken = getSemHeadToken(semHeadEC, jcas);
			}
			return semHeadToken;
		}
		return null;

	}

	//Helper Method: Checks if a given token is a trigger
	private boolean isATrigger(EnjuToken token, FSIterator<Annotation> eventIterator){
		boolean result = false;
		while (eventIterator.hasNext()) {
			Event event = (Event) eventIterator.next();
			int b1 = token.getBegin();
			int b2 = event.getBegin();
			int e1 = token.getEnd();
			int e2 = event.getEnd();
			if(b1==b2 && e1==e2){
				result = true;
				break;
			}
		}
		return result;
	}

	//Helper Method: Checks if the given node has a semantic head which covers the given begin and end values
	private boolean semHeadMatches(JCas jcas, SyntacticAnnotation someNode, int begin, int end){
		boolean result = false;
		if(!(someNode == null)){
			if(someNode.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
				EnjuConstituent modNodeEC = (EnjuConstituent) someNode;
				EnjuToken smeHeadToken = getSemHeadToken(modNodeEC, jcas);
				if(smeHeadToken == null){
					return false;
				}
				if((smeHeadToken.getBegin() <= begin) && (smeHeadToken.getEnd() >= end)){
					result = true;
				}
			}	
		}
		return result;
	}

	//Helper Method: Checks if the given node has a semantic head with given begin and end values
	private boolean semHeadMatches(JCas jcas, SyntacticAnnotation someNode, ArrayList<Integer> beginList, ArrayList<Integer> endList){
		boolean result = false;
		if(beginList.size() == endList.size()){
			if(!(someNode == null)){
				if(someNode.getClass().getName().equalsIgnoreCase("jp.ac.u_tokyo.s.is.www_tsujii.tools.enju.EnjuConstituent")){
					EnjuConstituent modNodeEC = (EnjuConstituent) someNode;
					EnjuToken smeHeadToken = getSemHeadToken(modNodeEC, jcas);
					if(smeHeadToken == null){
						return false;
					}
					for(int j=0; j<beginList.size(); ++j){
						int begin = beginList.get(j);
						int end = endList.get(j);
						if((smeHeadToken.getBegin() <= begin) && (smeHeadToken.getEnd() >= end)){
							result = true;
						}
					}
				}	
			}
		}
		else{
			System.out.println("The size of begin and end lists is not the same");
		}
		return result;
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



	private int getScopesOver(EnjuSentence sentence, Event event,
			ArrayList<EnjuToken> sentenceClues, ArrayList<EnjuToken> triggers,
			JCas jcas) {
		for (EnjuToken clue : sentenceClues){
			EnjuConstituent clueScope = clue.getArg2();
			if(clueScope!=null){
				if(event.getBegin()>=clueScope.getBegin() && event.getEnd()<=clueScope.getEnd())
					return 1;
			}
		}
		return 0;
	}






	private int getCarguments(String nodeType, EnjuSentence sentence, Event event, ArrayList<EnjuToken> sentenceClues, HashMap<String, EnjuToken> tokenMap, JCas jcas) throws AnalysisEngineProcessException {

		ArrayList<EnjuConstituent> argumentNodes = new ArrayList<EnjuConstituent>();
		FSArray participants = event.getParticipants();

		try{
			if (participants!=null) {
				for (int i =0; i<participants.size(); i++){

					EnjuToken argumentRep = null;
					FeatureStructure feat = participants.get(i);
					if(feat.getType().getShortName().equals("NamedEventParticipant")){
						NamedEventParticipant nep = (NamedEventParticipant) feat;
						if(nep.getTarget().getType().getShortName().equals("Event")){
							Event nestedEvent = (Event) nep.getTarget();
							ArrayList<EnjuToken> triggerTok = getTriggerTokens(sentence, nestedEvent, tokenMap, jcas);
							if(triggerTok.size()>0)
								argumentRep = triggerTok.get(0);
							else
								return -1;
						}
						else if (nep.getTarget().getType().getShortName().equals("Entity")){
							Entity argument = (Entity) nep.getTarget();
							ArrayList<EnjuToken> arguments =getEntityTokens(sentence, argument, tokenMap, jcas); 
							if(!arguments.isEmpty() && arguments.size()>0)
								argumentRep = arguments.get(0);
							else
								return -1;
						}
					}


					EnjuConstituent argumentConst = argumentRep.getParent();
					boolean topLevel = false;
					while (!topLevel && argumentConst.getParent().getType().getShortName().equals("EnjuConstituent")){
						argumentConst = (EnjuConstituent) argumentConst.getParent();
						if(argumentConst.getCat().equals(nodeType)){
							argumentNodes.add(argumentConst);
						}
						if(argumentConst.getParent().getType().getShortName().equals("Sentence"))
							topLevel = true;
					}
				}
			}
		}catch(IndexOutOfBoundsException e){

			throw new AnalysisEngineProcessException(new Exception("Sentence : " + sentence.getCoveredText() + " - Event : " + event.getCoveredText() +"\n" + e.getStackTrace()));
		}
		for (EnjuToken clue : sentenceClues){
			EnjuConstituent clueConst = clue.getParent();
			while (!clueConst.getCat().equals(nodeType) && !clueConst.getParent().getType().getShortName().equals("Sentence")){
				clueConst = (EnjuConstituent) clueConst.getParent();
			}
			for(EnjuConstituent node : argumentNodes){
				if(clueConst.getBegin()==node.getBegin() && clueConst.getEnd()==node.getEnd())
					return 1;
			}
		}
		return 0;
	}

	private int getCtrigger(String nodeType, EnjuSentence sentence, Event event, ArrayList<EnjuToken> sentenceClues, ArrayList<EnjuToken> triggers,
			JCas jcas) {
		EnjuToken triggerRep = triggers.get(0);
		EnjuConstituent triggerConst = triggerRep.getParent();
		ArrayList<EnjuConstituent> triggerNodes = new ArrayList<EnjuConstituent>();
		boolean topLevel = false; 
		while (!topLevel && triggerConst.getParent().getType().getShortName().equals("EnjuConstituent")){
			triggerConst = (EnjuConstituent) triggerConst.getParent();
			if(triggerConst.getCat().equals(nodeType)){
				triggerNodes.add(triggerConst);
			}
			if(triggerConst.getParent().getType().getShortName().equals("Sentence"))
				topLevel = true;
		}

		for (EnjuToken clue : sentenceClues){
			EnjuConstituent clueConst = clue.getParent();
			while (!clueConst.getCat().equals(nodeType) && !clueConst.getParent().getType().getShortName().equals("Sentence")){
				clueConst = (EnjuConstituent) clueConst.getParent();
			}
			for(EnjuConstituent node : triggerNodes){
				if(clueConst.getBegin()==node.getBegin() && clueConst.getEnd()==node.getEnd())
					return 1;
			}
		}
		return 0;

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

	public int getDD0(Event event, EnjuSentence sentence, HashMap<String, EnjuToken> tokenMap, ArrayList<EnjuToken> sentenceClues, JCas jcas) throws AnalysisEngineProcessException {
		HashMap<Integer,TreeSet<Integer>> graph = generateGraph(sentence, jcas);
		TreeSet<Integer> triggerIds = getTriggerIds(event, sentence, tokenMap, jcas);
		TreeSet<Integer> clueIds = getClueIds(sentenceClues);
		int dep = getDependencyDepth(graph,triggerIds,clueIds);
		return dep;
	}

	private int getDependencyDepth(HashMap<Integer, TreeSet<Integer>> graph, TreeSet<Integer> triggerIds, TreeSet<Integer> clueIds) {
		int d = 100;
		int dmax = 100;
		for(int i : clueIds){
			HashSet<Integer> visited = new HashSet<Integer> ();
			HashMap<Integer, Integer> toBeVisited = new HashMap<Integer, Integer> ();
			d = getDepDepth4Clue(i, triggerIds, 0, dmax, graph, visited, toBeVisited);
			if(d<dmax)
				dmax = d;
		}
		return dmax;
	}

	private int getDepDepth4Clue(int i, TreeSet<Integer> triggerIds, int d,
			int dmax, HashMap<Integer, TreeSet<Integer>> graph, HashSet<Integer> visited, HashMap<Integer, Integer> toBeVisited) {
		visited.add(i);
		if (d > dmax)
			return dmax;
		else{
			TreeSet<Integer> nextDep = graph.get(i);
			if(nextDep==null){
				return dmax;
			}
			toBeVisited = addNodesToBeVisited(toBeVisited, nextDep, d);

			for(int t : triggerIds){
				if(nextDep.contains(t))
					return d+1;
			}

			for(int i2 : nextDep){
				if(!visited.contains(i2)  && toBeVisited.containsKey(i2)){
					int d2 = getDepDepth4Clue(i2, triggerIds, toBeVisited.get(i2), dmax, graph, visited, toBeVisited);
					if (d2 < dmax){
						dmax = d2;
					}
				}
			}
		}
		return dmax;
	}

	private HashMap<Integer, Integer> addNodesToBeVisited(HashMap<Integer, Integer> toBeVisited, TreeSet<Integer> nextDep, int d) {
		for(Integer i : nextDep){
			if(toBeVisited.containsKey(i)){
				if(toBeVisited.get(i)>d+1){
					toBeVisited.put(i, d+1);
				}
			}
			else{
				toBeVisited.put(i, d+1);
			}
		}
		return toBeVisited;
	}

	private TreeSet<Integer> getClueIds(ArrayList<EnjuToken> clues) {
		TreeSet<Integer> clueIds = new TreeSet<Integer>();
		for(EnjuToken token : clues){
			clueIds.add(Integer.parseInt(token.getId().substring(1)));

		}
		return clueIds;
	}

	private TreeSet<Integer> getTriggerIds(Event event, EnjuSentence sentence, HashMap<String, EnjuToken> tokenMap, JCas jcas) throws AnalysisEngineProcessException {
		ArrayList<EnjuToken> triggers = getTriggerTokens(sentence, event, tokenMap, jcas);
		TreeSet<Integer> triggerIds = new TreeSet<Integer>();
		for(EnjuToken trigger : triggers){
			triggerIds.add(Integer.parseInt(trigger.getId().substring(1)));
		}
		return triggerIds;
	}

	private HashMap<Integer, TreeSet<Integer>> generateGraph(EnjuSentence sentence, JCas jcas) {
		HashMap<Integer, TreeSet<Integer>> graph = new HashMap<Integer, TreeSet<Integer>>();

		FSIterator<Annotation> tokenIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(sentence);
		while(tokenIterator.hasNext()){
			EnjuToken token = (EnjuToken) tokenIterator.next();

			if(token.getArg1()!=null ||token.getArg2()!=null || token.getArg3()!=null || token.getArg4()!=null ){
				int aNode = Integer.parseInt(token.getId().substring(1));

				EnjuConstituent arg = null;
				if(token.getArg1()!=null ){
					arg = token.getArg1();	
				}
				else if(token.getArg2()!=null ){
					arg = token.getArg2();	
				}
				else if(token.getArg3()!=null ){
					arg = token.getArg3();	
				}
				else if(token.getArg4()!=null ){
					arg = token.getArg4();	
				}
				FSIterator<Annotation> argIterator = jcas.getAnnotationIndex(EnjuToken.type).subiterator(arg);
				while(argIterator.hasNext()){
					EnjuToken argToken = (EnjuToken) argIterator.next();
					int bNode = Integer.parseInt(argToken.getId().substring(1));
					TreeSet<Integer> set;  
					if(aNode>=0 && bNode>=0){
						if(graph.containsKey(aNode)){
							set = graph.get(aNode);
						}
						else{
							set = new TreeSet<Integer>();
						}
						set.add(bNode);
						graph.put(aNode, set);

						if(graph.containsKey(bNode)){
							set = graph.get(bNode);
						}
						else{
							set = new TreeSet<Integer>();
						}

						set.add(aNode);
						graph.put(bNode, set);
					}
				}
			}
		}

		return graph;
	}



}
