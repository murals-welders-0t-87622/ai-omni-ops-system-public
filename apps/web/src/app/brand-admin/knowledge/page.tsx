"use client";
import {BusinessKnowledgeWorkspace} from "../../(dashboard)/brand-growth/business-knowledge-workspace";
import {getStoredCurrentBrandId} from "../../../services/auth-session";
export default function BrandKnowledgePage(){const brandId=getStoredCurrentBrandId();return brandId?<BusinessKnowledgeWorkspace key={brandId} brandId={brandId}/>:<p>请先选择品牌。</p>}
