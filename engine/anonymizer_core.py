import re
import sys
import subprocess
from typing import List, Dict, Optional, Any
from presidio_analyzer import AnalyzerEngine, RecognizerRegistry, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import NlpEngineProvider
from pydantic import BaseModel

# Available language models map
SPACY_MODEL_MAP = {
    "en": "en_core_web_sm",
    "fr": "fr_core_news_sm",
    "de": "de_core_news_sm",
    "es": "es_core_news_sm",
    "it": "it_core_news_sm"
}

def get_installed_spacy_models() -> List[str]:
    """Check which models can be imported via spacy."""
    import spacy.util
    installed = []
    for lang, model_name in SPACY_MODEL_MAP.items():
        if spacy.util.is_package(model_name):
            installed.append(lang)
    return installed

def install_spacy_model(lang: str) -> bool:
    """Download and install a spaCy model on-demand."""
    model_name = SPACY_MODEL_MAP.get(lang)
    if not model_name:
        raise ValueError(f"Unsupported language code: {lang}")
    
    cmd = [sys.executable, "-m", "spacy", "download", model_name]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return res.returncode == 0

class EngineService:
    def __init__(self):
        self.type_prefixes = {
            "PERSON": "PERSON",
            "ORGANIZATION": "COMPANY",
            "COMPANY": "COMPANY",
            "LOCATION": "LOCATION",
            "ADDRESS": "ADDRESS",
            "EMAIL_ADDRESS": "EMAIL",
            "PHONE_NUMBER": "PHONE",
            "IBAN_CODE": "IBAN",
            "CREDIT_CARD": "CREDIT_CARD",
            "SIRET": "SIRET",
            "NIR": "NIR",
            "VAT_ID": "TVA",
            "DATE_TIME": "DATE",
            "IP_ADDRESS": "IP"
        }
        self.analyzer: Optional[AnalyzerEngine] = None
        self.supported_langs: List[str] = []
        self._init_analyzer()

    def _init_analyzer(self):
        installed = get_installed_spacy_models()
        if not installed:
            installed = ["en"] # fallback
            
        models_cfg = [{"lang_code": l, "model_name": SPACY_MODEL_MAP[l]} for l in installed]
        
        nlp_configuration = {
            "nlp_engine_name": "spacy",
            "models": models_cfg,
        }

        provider = NlpEngineProvider(nlp_configuration=nlp_configuration)
        nlp_engine = provider.create_engine()

        registry = RecognizerRegistry(supported_languages=installed)
        registry.load_predefined_recognizers(nlp_engine=nlp_engine, languages=installed)

        # Custom street address patterns
        address_patterns = [
            Pattern(
                name="street_address",
                regex=r"(?i)\b\d{1,4}(?:[,\s]+(?:bis|ter|quater))?[\s,]+(?:rue|avenue|av\.|boulevard|bd|bvd|chemin|allée|impasse|route|place|quai|street|st|road|rd|drive|dr|way|strasse|str\.|calle|via)\s+[A-Za-zÀ-ÿ0-9\s'-]{3,40}\b",
                score=0.85
            ),
            Pattern(
                name="postal_code_city",
                regex=r"\b(?:0[1-9]|[1-8]\d|9[0-8])\d{3}\s+[A-ZÀ-ÿ][a-zà-ÿA-ZÀ-ÿ\s'-]{2,30}\b",
                score=0.8
            )
        ]
        
        # Financial patterns
        siret_patterns = [
            Pattern(name="fr_siret", regex=r"\b\d{3}[\s.]?\d{3}[\s.]?\d{3}[\s.]?\d{5}\b", score=0.9),
            Pattern(name="fr_siren", regex=r"(?i)(?:siren\s*[:#]?\s*)\b\d{3}[\s.]?\d{3}[\s.]?\d{3}\b", score=0.9)
        ]
        nir_patterns = [
            Pattern(name="fr_nir", regex=r"\b[12]\s?\d{2}\s?(?:0[1-9]|1[0-2]|2[0-9])\s?(?:0[1-9]|[1-8]\d|9[0-9]|2[ABab])\s?\d{3}\s?\d{3}(?:\s?\d{2})?\b", score=0.88)
        ]
        vat_patterns = [
            Pattern(name="eu_vat", regex=r"(?i)\b(?:FR|DE|GB|ES|IT|NL|BE)\s?[0-9A-Z]{2}\s?[0-9]{9}\b", score=0.9)
        ]

        for l in installed:
            registry.add_recognizer(PatternRecognizer(supported_entity="ADDRESS", patterns=address_patterns, supported_language=l))
            registry.add_recognizer(PatternRecognizer(supported_entity="SIRET", patterns=siret_patterns, supported_language=l))
            registry.add_recognizer(PatternRecognizer(supported_entity="NIR", patterns=nir_patterns, supported_language=l))
            registry.add_recognizer(PatternRecognizer(supported_entity="VAT_ID", patterns=vat_patterns, supported_language=l))

        self.analyzer = AnalyzerEngine(nlp_engine=nlp_engine, registry=registry, supported_languages=installed)
        self.supported_langs = installed

    def reload_analyzer(self):
        """Call after installing a new language model to re-initialize."""
        self._init_analyzer()

    def detect_entities(self, text: str, language: str = "en", active_categories: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        lang = language.lower()[:2]
        if lang not in self.supported_langs:
            lang = self.supported_langs[0] if self.supported_langs else "en"

        category_map = {
            "identity": ["PERSON"],
            "organization": ["ORGANIZATION", "LOCATION"],
            "address": ["ADDRESS"],
            "contact": ["EMAIL_ADDRESS", "PHONE_NUMBER"],
            "finance": ["IBAN_CODE", "CREDIT_CARD", "SIRET", "NIR", "VAT_ID"]
        }
        
        entities_to_detect = []
        if active_categories:
            for cat in active_categories:
                entities_to_detect.extend(category_map.get(cat, []))
        else:
            for ents in category_map.values():
                entities_to_detect.extend(ents)
        
        entities_to_detect = list(set(entities_to_detect))
        
        results = self.analyzer.analyze(
            text=text,
            entities=entities_to_detect,
            language=lang,
            score_threshold=0.35
        )

        detected = []
        counters: Dict[str, int] = {}
        sorted_results = sorted(results, key=lambda x: (x.start, -x.end))
        
        filtered_results = []
        last_end = -1
        for res in sorted_results:
            if res.start >= last_end:
                filtered_results.append(res)
                last_end = res.end
            else:
                if filtered_results and res.score > filtered_results[-1].score and (res.end - res.start) > (filtered_results[-1].end - filtered_results[-1].start):
                    filtered_results[-1] = res
                    last_end = res.end

        for idx, res in enumerate(filtered_results):
            raw_text = text[res.start:res.end].strip()
            if not raw_text:
                continue
            
            ent_type = res.entity_type
            prefix = self.type_prefixes.get(ent_type, ent_type)
            count = counters.get(prefix, 0) + 1
            counters[prefix] = count
            placeholder = f"[{prefix}_{count}]"
            
            detected.append({
                "id": f"entity_{idx}_{res.start}",
                "text": raw_text,
                "entity_type": ent_type,
                "start": res.start,
                "end": res.end,
                "score": round(res.score, 2),
                "placeholder": placeholder
            })
            
        return detected

    def anonymize_text(self, text: str, mappings: Dict[str, str]) -> str:
        if not mappings or not text:
            return text

        sorted_originals = sorted(mappings.keys(), key=len, reverse=True)
        anonymized = text
        for orig in sorted_originals:
            placeholder = mappings[orig]
            pattern = re.escape(orig)
            anonymized = re.sub(pattern, placeholder, anonymized)
            
        return anonymized

    def deanonymize_text(self, text: str, mappings: Dict[str, str]) -> Dict[str, Any]:
        if not mappings or not text:
            return {"restored_text": text, "restored_items": []}

        inv_mappings = {v: k for k, v in mappings.items()}
        sorted_placeholders = sorted(inv_mappings.keys(), key=len, reverse=True)
        
        restored = text
        restored_items = []
        
        for pl in sorted_placeholders:
            orig = inv_mappings[pl]
            pattern = re.escape(pl)
            matches = list(re.finditer(pattern, restored))
            if matches:
                restored_items.append({
                    "placeholder": pl,
                    "original": orig,
                    "count": len(matches)
                })
                restored = re.sub(pattern, orig, restored)
                
        return {
            "restored_text": restored,
            "restored_items": restored_items
        }

engine_service = EngineService()
