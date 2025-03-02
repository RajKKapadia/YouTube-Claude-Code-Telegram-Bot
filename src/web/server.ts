import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import cors from 'cors';
import { config } from '../config';
import { LeadService } from '../services/lead.service';
import { DatabaseService } from '../services/db.service';
import { logger } from '../utils/logger';

// Get admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

export class WebServer {
  private app: express.Application;
  private PORT: number;
  private leadService: LeadService;

  constructor() {
    // Initialize express app
    this.app = express();
    this.PORT = parseInt(process.env.WEB_PORT || '3000', 10);
    this.leadService = new LeadService();
    
    // Configure express app
    this.configureApp();
    this.setupRoutes();
    
    logger.info(`Web server configured. Admin UI will be available at http://localhost:${this.PORT}`);
  }

  private configureApp(): void {
    // Middleware
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Set view engine
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
    
    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Set up session with MongoDB store
    this.app.use(
      session({
        secret: process.env.SESSION_SECRET || 'telegram-bot-session-secret',
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
          mongoUrl: config.mongodb.uri,
          collectionName: 'sessions',
        }),
        cookie: {
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          secure: process.env.NODE_ENV === 'production',
        },
      })
    );
  }

  private setupRoutes(): void {
    // Auth middleware
    const requireAuth = (req: any, res: express.Response, next: express.NextFunction): void => {
      if (req.session.authenticated) {
        return next();
      }
      res.redirect('/login');
    };

    // Login page
    this.app.get('/login', (req, res): void => {
      res.render('login', { error: null });
    });

    // Login POST
    this.app.post('/login', (req, res): void => {
      const { username, password } = req.body;
      
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        (req as any).session.authenticated = true;
        (req as any).session.username = username;
        res.redirect('/');
        return;
      }
      
      res.render('login', { error: 'Invalid credentials' });
    });

    // Logout
    this.app.get('/logout', (req, res): void => {
      (req as any).session.destroy();
      res.redirect('/login');
    });

    // Dashboard - Leads listing
    this.app.get('/', requireAuth, async (req, res): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string || '1', 10);
        const limit = parseInt(req.query.limit as string || '10', 10);
        const status = req.query.status as string || 'all';
        const searchTerm = req.query.q as string || '';
        
        const { leads, total, pages } = await this.leadService.getAllLeads({
          page,
          limit,
          status,
          searchTerm,
        });
        
        res.render('dashboard', {
          leads,
          currentPage: page,
          totalPages: pages,
          totalLeads: total,
          status,
          searchTerm,
          user: (req as any).session.username,
        });
      } catch (error) {
        res.status(500).render('error', { error: 'Failed to load leads' });
      }
    });

    // View lead details
    this.app.get('/leads/:id', requireAuth, async (req, res): Promise<void> => {
      try {
        const leadId = req.params.id;
        const lead = await this.leadService.getLeadById(leadId);
        
        if (!lead) {
          res.status(404).render('error', { error: 'Lead not found' });
          return;
        }
        
        res.render('lead-details', {
          lead,
          user: (req as any).session.username,
        });
      } catch (error) {
        res.status(500).render('error', { error: 'Failed to load lead details' });
      }
    });

    // Update lead status - API endpoint
    this.app.post('/api/leads/:id/status', requireAuth, async (req, res): Promise<void> => {
      try {
        const leadId = req.params.id;
        const { status, callbackDate, notes } = req.body;
        
        // Validate status
        const validStatuses = ['new', 'contacted', 'callback', 'completed', 'not_interested'];
        if (!validStatuses.includes(status)) {
          res.status(400).json({ error: 'Invalid status' });
          return;
        }
        
        // Prepare data for update
        const updateData: any = {};
        
        if (callbackDate) {
          updateData.callbackDate = new Date(callbackDate);
        }
        
        if (notes) {
          updateData.notes = notes;
        }
        
        const updatedLead = await this.leadService.updateLeadStatus(
          leadId,
          status as any,
          updateData
        );
        
        if (!updatedLead) {
          res.status(404).json({ error: 'Lead not found' });
          return;
        }
        
        res.json({ success: true, lead: updatedLead });
      } catch (error) {
        logger.error('Error updating lead status', error);
        res.status(500).json({ error: 'Failed to update lead status' });
      }
    });

    // API endpoints

    // Get all leads - API
    this.app.get('/api/leads', requireAuth, async (req, res): Promise<void> => {
      try {
        const page = parseInt(req.query.page as string || '1', 10);
        const limit = parseInt(req.query.limit as string || '10', 10);
        const status = req.query.status as string || 'all';
        const searchTerm = req.query.q as string || '';
        
        const result = await this.leadService.getAllLeads({
          page,
          limit,
          status,
          searchTerm,
        });
        
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leads' });
      }
    });

    // Get lead by ID - API
    this.app.get('/api/leads/:id', requireAuth, async (req, res): Promise<void> => {
      try {
        const leadId = req.params.id;
        const lead = await this.leadService.getLeadById(leadId);
        
        if (!lead) {
          res.status(404).json({ error: 'Lead not found' });
          return;
        }
        
        res.json(lead);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lead' });
      }
    });
  }

  public async start(): Promise<void> {
    this.app.listen(this.PORT, () => {
      logger.info(`Web server running on http://localhost:${this.PORT}`);
    });
  }
}

export default WebServer;