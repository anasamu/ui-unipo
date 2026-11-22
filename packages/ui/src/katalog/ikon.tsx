'use client';
import * as React from 'react';
import { Boxes, ShieldCheck, Database, GraduationCap, Users, Compass, Landmark, FileCheck2, Warehouse, Megaphone, KeyRound, UserRound, Bell, Plug, Send, Gauge, ListTree, Building2, BookOpen, CalendarDays, DoorOpen, UserPlus, MonitorPlay, ClipboardCheck, MessageSquareText, Route, Repeat, Award, Briefcase, IdCard, Wallet, FlaskConical, BadgeCheck, Target, Handshake, Archive, LifeBuoy, BookMarked, Library, Newspaper, Contact, UserCog, ScrollText, Server, Radio, Palette, Mail, Scale, BookCheck, PartyPopper, FileSignature, ScanSearch, ScanLine, Crown, Stamp, BookText, UsersRound, ListChecks, HandCoins, Calculator, Banknote, Receipt, FileText, HardDrive, MessagesSquare, QrCode } from 'lucide-react';

const PETA: Record<string, React.ComponentType> = { ShieldCheck, Database, GraduationCap, Users, Compass, Landmark, FileCheck2, Warehouse, Megaphone, KeyRound, UserRound, Bell, Plug, Send, Gauge, ListTree, Building2, BookOpen, CalendarDays, DoorOpen, UserPlus, MonitorPlay, ClipboardCheck, MessageSquareText, Route, Repeat, Award, Briefcase, IdCard, Wallet, FlaskConical, BadgeCheck, Target, Handshake, Archive, LifeBuoy, BookMarked, Library, Newspaper, Contact, UserCog, ScrollText, Server, Radio, Palette, Mail, Scale, BookCheck, PartyPopper, FileSignature, ScanSearch, ScanLine, Crown, Stamp, BookText, UsersRound, ListChecks, HandCoins, Calculator, Banknote, Receipt, FileText, HardDrive, MessagesSquare, QrCode };

/** Ikon modul/grup katalog dari nama ikon lucide di scripts/katalog/modul.mjs. */
export function IkonKatalog({ nama }: { nama: string | undefined }) {
  const I = (nama && PETA[nama]) || Boxes;
  return <I />;
}
