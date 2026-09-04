import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  checkboxOutline,
  flagOutline,
  pulseOutline,
  ribbonOutline,
  rocketOutline,
} from 'ionicons/icons';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-analytics',
  imports: [RouterLink, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, PageHeaderComponent],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar><ion-title>Analytics</ion-title></ion-toolbar></ion-header
    >
    <ion-content
      ><main class="page-wrap analytics-page">
        <app-page-header
          eyebrow="Trends"
          title="Analytics"
          description="See how delivery, workload, and follow-through change over time." />
        <section class="analytics-intro">
          <strong>Trend summaries are being prepared.</strong
          ><span>Office Orbit will show analytics here when efficient aggregate data is available.</span>
        </section>
        <div class="analytics-grid">
          @for (section of sections; track section.id) {
            <article class="analytics-card" [class.selected]="selected === section.id" [attr.id]="section.id">
              <ion-icon [name]="section.icon" aria-hidden="true" />
              <div>
                <span class="section-label">{{ section.eyebrow }}</span>
                <h2>{{ section.title }}</h2>
                <p>{{ section.description }}</p>
              </div>
              @if (section.link) {
                <a [routerLink]="section.link">Open {{ section.linkLabel }}</a>
              }
            </article>
          }
        </div>
      </main></ion-content
    >`,
})
export class AnalyticsPage {
  private readonly route = inject(ActivatedRoute);
  readonly selected = this.route.snapshot.queryParamMap.get('section');
  readonly sections = [
    {
      id: 'sprint-health',
      eyebrow: 'Sprint health',
      title: 'Spillover trend',
      description: 'Spillovers by Sprint and their direction over time.',
      icon: 'pulse-outline',
      link: '/app/sprints',
      linkLabel: 'Sprints',
    },
    {
      id: 'blockers',
      eyebrow: 'Blockers',
      title: 'Blocked work',
      description: 'Blocked JIRA counts by Sprint.',
      icon: 'flag-outline',
      link: '/app/jiras',
      linkLabel: 'JIRAs',
    },
    {
      id: 'delivery',
      eyebrow: 'Delivery',
      title: 'Work state',
      description: 'Done, active, and spilled work proportions.',
      icon: 'checkbox-outline',
      link: '/app/jiras',
      linkLabel: 'JIRAs',
    },
    {
      id: 'work-activity',
      eyebrow: 'Work activity',
      title: 'Work Log trends',
      description: 'Work activity by week, month, type, and category.',
      icon: 'bar-chart-outline',
      link: '/app/work-logs',
      linkLabel: 'Work Log',
    },
    {
      id: 'appraisal',
      eyebrow: 'Recognition',
      title: 'Appraisal highlights',
      description: 'Appraisal-worthy work and feedback over time.',
      icon: 'ribbon-outline',
      link: '/app/feedback',
      linkLabel: 'Feedback',
    },
    {
      id: 'releases',
      eyebrow: 'Releases',
      title: 'Release outcomes',
      description: 'Pending and confirmed releases over time.',
      icon: 'rocket-outline',
      link: '/app/releases',
      linkLabel: 'Releases',
    },
  ];
  constructor() {
    addIcons({ barChartOutline, checkboxOutline, flagOutline, pulseOutline, ribbonOutline, rocketOutline });
  }
}
