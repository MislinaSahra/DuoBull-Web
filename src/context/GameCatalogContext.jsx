import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchGameCatalog, subscribeToGameCatalog } from "../services/GameCatalogService.js";
const Context = createContext(null);
export function GameCatalogProvider({ children }) { const [games,setGames]=useState([]); const refresh=useCallback(()=>fetchGameCatalog().then(setGames),[]); useEffect(()=>{refresh();return subscribeToGameCatalog(refresh);},[refresh]); const value=useMemo(()=>({games,gameNames:games.filter(g=>g.is_active).map(g=>g.name),getGame:name=>games.find(g=>g.name===name)||{roles:[],ranks:[],characters:[],team_size:5},refresh}),[games,refresh]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useGameCatalog(){const value=useContext(Context);if(!value)throw new Error("useGameCatalog requires GameCatalogProvider");return value;}
